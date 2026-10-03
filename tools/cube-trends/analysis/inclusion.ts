import type { Panel } from './panel';

export interface InclusionRow {
    ir: number[];
    unweighted: number[];
    count: number[];
}

export function computeInclusion(panel: Panel, weights: number[][]): Map<string, InclusionRow> {
    const { samples, grid } = panel;
    const keys = new Set<string>();

    for (const row of grid) {
        for (const revId of row) {
            if (revId === null) {
                continue;
            }
            for (const key of panel.revisions.get(revId)!.cards) {
                keys.add(key);
            }
        }
    }

    const inclusion = new Map<string, InclusionRow>();

    for (const key of keys) {
        const ir: number[] = [];
        const unweighted: number[] = [];
        const count: number[] = [];

        for (let k = 0; k < samples.length; k++) {
            let weightedPresent = 0;
            let weightedTotal = 0;
            let unweightedPresent = 0;
            let unweightedTotal = 0;
            let cnt = 0;

            for (let c = 0; c < grid.length; c++) {
                const revId = grid[c][k];
                if (revId === null) {
                    continue;
                }

                const present = panel.revisions.get(revId)!.cards.has(key);
                const w = weights[c][k];

                weightedTotal += w;
                unweightedTotal += 1;
                if (present) {
                    weightedPresent += w;
                    unweightedPresent += 1;
                    cnt += 1;
                }
            }

            ir.push(weightedTotal === 0 ? 0 : weightedPresent / weightedTotal);
            unweighted.push(unweightedTotal === 0 ? 0 : unweightedPresent / unweightedTotal);
            count.push(cnt);
        }

        inclusion.set(key, { ir, unweighted, count });
    }

    return inclusion;
}
