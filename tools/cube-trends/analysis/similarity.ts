import type { Panel } from './panel';

// Cosine similarity over binary (presence/absence) copy-key sets.
export function binaryCosine(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) {
        return 0;
    }

    let intersection = 0;
    for (const key of a) {
        if (b.has(key)) {
            intersection++;
        }
    }

    return intersection / Math.sqrt(a.size * b.size);
}

export function createSimilarity(panel: Panel): (revA: string, revB: string) => number {
    const cache = new Map<string, number>();

    return (revA: string, revB: string) => {
        const key = [revA, revB].sort().join('|');
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const a = panel.revisions.get(revA)!.cards;
        const b = panel.revisions.get(revB)!.cards;
        const sim = revA === revB ? 1 : binaryCosine(a, b);
        cache.set(key, sim);
        return sim;
    };
}
