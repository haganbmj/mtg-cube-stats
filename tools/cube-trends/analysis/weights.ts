import type { Panel } from './panel';
import type { TrendsConfig } from '../types';

const DAY = 86_400_000;

export function computeWeights(panel: Panel, config: TrendsConfig, sim: (a: string, b: string) => number): number[][] {
    const { samples, grid } = panel;
    const { halfLifeDays, similarityTau, weighting } = config;

    return grid.map((row, c) => row.map((revId, k) => {
        if (revId === null) {
            return 0;
        }

        let weight = 1;

        if (weighting.recency) {
            const rev = panel.revisions.get(revId)!;
            weight *= 2 ** (-(samples[k] - rev.date) / (halfLifeDays * DAY));
        }

        if (weighting.dedupe) {
            let sum = 0;
            for (let other = 0; other < grid.length; other++) {
                if (other === c) {
                    continue;
                }
                const otherRevId = grid[other][k];
                if (otherRevId === null) {
                    continue;
                }
                const s = sim(revId, otherRevId);
                sum += Math.max(0, (s - similarityTau) / (1 - similarityTau));
            }
            weight *= 1 / (1 + sum);
        }

        return weight;
    }));
}
