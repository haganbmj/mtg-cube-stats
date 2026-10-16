import type { AnalysisContext } from './context';
import { copyNumber } from './cardInfo';

export interface CubeChurn {
    cubeId: string;
    adds: number[];
    removes: number[];
    rate: (number | null)[];
    totalAdds: number;
    totalRemoves: number;
    meanRate: number;
}

export interface ChurnResult {
    community: { rate: (number | null)[] };
    cubes: CubeChurn[];
}

export function analyzeChurn(ctx: AnalysisContext): ChurnResult {
    const { panel, weights, diffs } = ctx;
    const { samples, grid, cubes, revisions } = panel;

    const cubeChurns: CubeChurn[] = cubes.map((cube, c) => {
        const adds = samples.map(() => 0);
        const removes = samples.map(() => 0);

        for (let k = 1; k < samples.length; k++) {
            for (const event of diffs) {
                if (event.cubeId !== cube.id || event.date <= samples[k - 1] || event.date > samples[k]) {
                    continue;
                }
                if (event.type === 'add') {
                    adds[k]++;
                } else {
                    removes[k]++;
                }
            }
        }

        const rate: (number | null)[] = samples.map((_, k) => {
            if (k === 0) {
                return null;
            }
            const revId = grid[c][k];
            if (revId === null) {
                return null;
            }
            let size = 0;
            for (const key of revisions.get(revId)!.cards) {
                if (copyNumber(key) === 1) {
                    size++;
                }
            }
            if (size === 0) {
                return null;
            }
            return (adds[k] + removes[k]) / (2 * size);
        });

        const nonNullRates = rate.filter((r): r is number => r !== null);
        const meanRate = nonNullRates.length === 0 ? 0 : nonNullRates.reduce((a, b) => a + b, 0) / nonNullRates.length;

        return {
            cubeId: cube.id,
            adds,
            removes,
            rate,
            totalAdds: diffs.filter((e) => e.cubeId === cube.id && e.type === 'add').length,
            totalRemoves: diffs.filter((e) => e.cubeId === cube.id && e.type === 'remove').length,
            meanRate,
        };
    });

    const communityRate: (number | null)[] = samples.map((_, k) => {
        let num = 0;
        let den = 0;
        cubeChurns.forEach((cc, c) => {
            const r = cc.rate[k];
            if (r === null) {
                return;
            }
            num += weights[c][k] * r;
            den += weights[c][k];
        });
        return den === 0 ? null : num / den;
    });

    const sortedCubes = [...cubeChurns].sort((a, b) =>
        (b.totalAdds + b.totalRemoves) - (a.totalAdds + a.totalRemoves) || a.cubeId.localeCompare(b.cubeId));

    return { community: { rate: communityRate }, cubes: sortedCubes };
}
