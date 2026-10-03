import type { Ms } from '../types';
import type { AnalysisContext } from './context';
import { baseOracleId } from './cardInfo';
import { weightedQuantile } from './stats';

const DAY = 86_400_000;

export interface TimelinePoint {
    t: Ms;
    cubes: number;
    medianAgeDays: number | null;
    shareUnder: { m3: number; m6: number; m12: number };
    homogenization: { weightedMean: number; mean: number; q1: number; median: number; q3: number } | null;
    adds: number;
    removes: number;
}

export interface TimelineResult {
    points: TimelinePoint[];
}

interface AgeEntry {
    value: number;
    weight: number;
}

function shareUnder(entries: AgeEntry[], totalWeight: number, thresholdDays: number): number {
    if (totalWeight === 0) {
        return 0;
    }
    const under = entries.filter((e) => e.value < thresholdDays).reduce((sum, e) => sum + e.weight, 0);
    return under / totalWeight;
}

export function analyzeTimeline(ctx: AnalysisContext): TimelineResult {
    const { panel, weights, sim, diffs } = ctx;
    const { samples, grid } = panel;

    const points: TimelinePoint[] = samples.map((t, k) => {
        const presentCubes: number[] = [];
        for (let c = 0; c < grid.length; c++) {
            if (grid[c][k] !== null) {
                presentCubes.push(c);
            }
        }

        const ages: AgeEntry[] = [];
        for (const c of presentCubes) {
            const rev = panel.revisions.get(grid[c][k]!)!;
            for (const key of rev.cards) {
                const info = panel.cardInfo.get(baseOracleId(key));
                if (!info?.eligibility) {
                    continue;
                }
                ages.push({ value: (t - info.eligibility.date) / DAY, weight: weights[c][k] });
            }
        }

        const totalAgeWeight = ages.reduce((sum, e) => sum + e.weight, 0);
        const medianAgeDays = ages.length === 0
            ? null
            : weightedQuantile(ages.map((e) => e.value), ages.map((e) => e.weight), 0.5);

        let homogenization: TimelinePoint['homogenization'] = null;
        if (presentCubes.length >= 2) {
            const sims: number[] = [];
            let weightedNum = 0;
            let weightedDen = 0;
            for (let i = 0; i < presentCubes.length; i++) {
                for (let j = i + 1; j < presentCubes.length; j++) {
                    const a = presentCubes[i];
                    const b = presentCubes[j];
                    const s = sim(grid[a][k]!, grid[b][k]!);
                    const pairWeight = weights[a][k] * weights[b][k];
                    sims.push(s);
                    weightedNum += pairWeight * s;
                    weightedDen += pairWeight;
                }
            }
            const unitWeights = sims.map(() => 1);
            homogenization = {
                weightedMean: weightedDen === 0 ? 0 : weightedNum / weightedDen,
                mean: sims.reduce((sum, s) => sum + s, 0) / sims.length,
                q1: weightedQuantile(sims, unitWeights, 0.25),
                median: weightedQuantile(sims, unitWeights, 0.5),
                q3: weightedQuantile(sims, unitWeights, 0.75),
            };
        }

        const prevT = k === 0 ? null : samples[k - 1];
        let adds = 0;
        let removes = 0;
        for (const event of diffs) {
            if (prevT === null || event.date <= prevT || event.date > t) {
                continue;
            }
            if (event.type === 'add') {
                adds++;
            } else {
                removes++;
            }
        }

        return {
            t,
            cubes: presentCubes.length,
            medianAgeDays,
            shareUnder: {
                m3: shareUnder(ages, totalAgeWeight, 90),
                m6: shareUnder(ages, totalAgeWeight, 180),
                m12: shareUnder(ages, totalAgeWeight, 365),
            },
            homogenization,
            adds,
            removes,
        };
    });

    return { points };
}
