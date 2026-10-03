export function weightedQuantile(values: number[], weights: number[], q: number): number {
    const pairs = values
        .map((v, i) => ({ v, w: weights[i] }))
        .filter((p) => p.w > 0);

    const total = pairs.reduce((sum, p) => sum + p.w, 0);
    if (total === 0) {
        return NaN;
    }

    const clampedQ = Math.max(0, Math.min(1, q));
    const target = clampedQ * total;

    pairs.sort((a, b) => a.v - b.v);

    let cumulative = 0;
    for (const p of pairs) {
        cumulative += p.w;
        if (cumulative >= target) {
            return p.v;
        }
    }
    return pairs[pairs.length - 1].v;
}

export function theilSen(xs: number[], ys: number[]): number {
    const slopes: number[] = [];
    for (let i = 0; i < xs.length; i++) {
        for (let j = i + 1; j < xs.length; j++) {
            if (xs[i] === xs[j]) {
                continue;
            }
            slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
        }
    }

    if (slopes.length === 0) {
        return 0;
    }

    slopes.sort((a, b) => a - b);
    const mid = Math.floor(slopes.length / 2);
    return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
}

export interface Spell {
    duration: number;
    event: boolean;
}

export function kaplanMeier(spells: Spell[]): { t: number; s: number }[] {
    const eventTimes = [...new Set(spells.filter((s) => s.event).map((s) => s.duration))].sort((a, b) => a - b);

    const points = [{ t: 0, s: 1 }];
    let survival = 1;
    for (const t of eventTimes) {
        const n = spells.filter((s) => s.duration >= t).length;
        const d = spells.filter((s) => s.event && s.duration === t).length;
        survival *= 1 - d / n;
        points.push({ t, s: survival });
    }
    return points;
}

export function largestRemainder(shares: Record<string, number>, total: number): Record<string, number> {
    const keys = Object.keys(shares);
    const sum = keys.reduce((acc, k) => acc + shares[k], 0);

    if (sum === 0) {
        return Object.fromEntries(keys.map((k) => [k, 0]));
    }

    const normalized = keys.map((k) => shares[k] / sum);
    const floors = normalized.map((n) => Math.floor(n * total));
    const remainders = normalized.map((n, i) => n * total - floors[i]);

    let remaining = total - floors.reduce((acc, f) => acc + f, 0);
    const order = keys.map((_, i) => i).sort((a, b) => remainders[b] - remainders[a]);

    const result = [...floors];
    for (const i of order) {
        if (remaining <= 0) {
            break;
        }
        result[i] += 1;
        remaining -= 1;
    }

    return Object.fromEntries(keys.map((k, i) => [k, result[i]]));
}
