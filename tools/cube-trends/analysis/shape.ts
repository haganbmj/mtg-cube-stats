import type { Ms } from '../types';
import type { AnalysisContext } from './context';
import { baseOracleId, type ColorCategory } from './cardInfo';
import { weightedQuantile } from './stats';

export interface Band {
    q1: number;
    median: number;
    q3: number;
}

export interface ShapePoint {
    t: Ms;
    color: Record<ColorCategory, Band>;
    type: Record<string, Band>;
    meanMv: Band;
    size: Band;
    mvHistogram: Record<string, Band>;
}

export interface ShapeResult {
    points: ShapePoint[];
    types: string[];
}

const COLOR_CATEGORIES: ColorCategory[] = ['W', 'U', 'B', 'R', 'G', 'M', 'C', 'L'];
const MV_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

function mvBucket(cmc: number): string {
    const floored = Math.floor(cmc);
    return floored >= 7 ? '7+' : String(floored);
}

function band(values: number[], weights: number[]): Band {
    const median = weightedQuantile(values, weights, 0.5);
    if (Number.isNaN(median)) {
        return { q1: 0, median: 0, q3: 0 };
    }
    return {
        q1: weightedQuantile(values, weights, 0.25),
        median,
        q3: weightedQuantile(values, weights, 0.75),
    };
}

function collectTypes(ctx: AnalysisContext): string[] {
    const { panel } = ctx;
    const revIdsInGrid = new Set<string>();
    for (const row of panel.grid) {
        for (const id of row) {
            if (id !== null) {
                revIdsInGrid.add(id);
            }
        }
    }

    const types = new Set<string>();
    for (const revId of revIdsInGrid) {
        const rev = panel.revisions.get(revId)!;
        for (const key of rev.cards) {
            const info = panel.cardInfo.get(baseOracleId(key));
            if (info) {
                types.add(info.primaryType);
            }
        }
    }
    return [...types].sort();
}

interface CubeShapeStats {
    size: number;
    colorCounts: Record<ColorCategory, number>;
    typeCounts: Record<string, number>;
    meanMv: number | null;
    histCounts: Record<string, number>;
}

function statsForCube(cards: Set<string>, ctx: AnalysisContext): CubeShapeStats {
    const colorCounts = Object.fromEntries(COLOR_CATEGORIES.map((c) => [c, 0])) as Record<ColorCategory, number>;
    const typeCounts: Record<string, number> = {};
    const histCounts = Object.fromEntries(MV_BUCKETS.map((b) => [b, 0]));
    const mvValues: number[] = [];
    let size = 0;

    for (const key of cards) {
        const info = ctx.panel.cardInfo.get(baseOracleId(key));
        if (!info) {
            continue;
        }
        size++;
        colorCounts[info.colorCategory]++;
        typeCounts[info.primaryType] = (typeCounts[info.primaryType] ?? 0) + 1;
        if (info.colorCategory !== 'L') {
            mvValues.push(info.cmc);
            histCounts[mvBucket(info.cmc)]++;
        }
    }

    return {
        size,
        colorCounts,
        typeCounts,
        meanMv: mvValues.length === 0 ? null : mvValues.reduce((sum, v) => sum + v, 0) / mvValues.length,
        histCounts,
    };
}

export function analyzeShape(ctx: AnalysisContext): ShapeResult {
    const { panel, weights } = ctx;
    const { samples, grid } = panel;
    const types = collectTypes(ctx);

    const points: ShapePoint[] = samples.map((t, k) => {
        const perCube: { stats: CubeShapeStats; weight: number }[] = [];
        for (let c = 0; c < grid.length; c++) {
            const revId = grid[c][k];
            if (revId === null) {
                continue;
            }
            const rev = panel.revisions.get(revId)!;
            perCube.push({ stats: statsForCube(rev.cards, ctx), weight: weights[c][k] });
        }

        const sizeValues = perCube.map((p) => p.stats.size);
        const sizeWeights = perCube.map((p) => p.weight);

        const color = Object.fromEntries(COLOR_CATEGORIES.map((cat) => {
            const values = perCube.map((p) => (p.stats.size === 0 ? 0 : p.stats.colorCounts[cat] / p.stats.size));
            return [cat, band(values, sizeWeights)];
        })) as Record<ColorCategory, Band>;

        const type = Object.fromEntries(types.map((typeName) => {
            const values = perCube.map((p) => (p.stats.size === 0 ? 0 : (p.stats.typeCounts[typeName] ?? 0) / p.stats.size));
            return [typeName, band(values, sizeWeights)];
        }));

        const mvEntries = perCube.filter((p) => p.stats.meanMv !== null);
        const meanMv = band(mvEntries.map((p) => p.stats.meanMv!), mvEntries.map((p) => p.weight));

        const mvHistogram = Object.fromEntries(MV_BUCKETS.map((bucket) => {
            const values = perCube.map((p) => p.stats.histCounts[bucket]);
            return [bucket, band(values, sizeWeights)];
        }));

        return {
            t,
            color,
            type,
            meanMv,
            size: band(sizeValues, sizeWeights),
            mvHistogram,
        };
    });

    return { points, types };
}
