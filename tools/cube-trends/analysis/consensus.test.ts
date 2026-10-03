import { describe, it, expect } from 'vitest';
import type { TrendsConfig } from '../types';
import { resolveConfig } from '../config';
import type { AnalysisContext } from './context';
import type { Panel } from './panel';
import type { InclusionRow } from './inclusion';
import { makeCardInfo } from './fixtures';
import { baseOracleId, type CardInfo, type ColorCategory } from './cardInfo';
import type { Band, ShapeResult } from './shape';
import { analyzeConsensus } from './consensus';

const COLOR_CATEGORIES: ColorCategory[] = ['W', 'U', 'B', 'R', 'G', 'M', 'C', 'L'];
const MV_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

function band(median: number): Band {
    return { q1: median, median, q3: median };
}

function buildShape(colorMedians: Partial<Record<ColorCategory, number>>, sizeMedian: number, types: string[] = []): ShapeResult {
    const color = Object.fromEntries(COLOR_CATEGORIES.map((c) => [c, band(colorMedians[c] ?? 0)])) as Record<ColorCategory, Band>;
    const type = Object.fromEntries(types.map((t) => [t, band(0)]));
    const mvHistogram = Object.fromEntries(MV_BUCKETS.map((b) => [b, band(0)]));
    return {
        types,
        points: [{ t: 0, color, type, meanMv: band(0), size: band(sizeMedian), mvHistogram }],
    };
}

interface CandidateSpec {
    key: string;
    info?: Partial<CardInfo>;
    ir: number;
    elo?: number;
}

// Hand-built context giving full control over per-key score, bypassing the natural
// invariant that a copy's IR can never exceed its base's (needed for the forced-anomaly test).
function makeConsensusContext(candidates: CandidateSpec[], configOverrides: Partial<TrendsConfig> = {}): AnalysisContext {
    const cardInfo = new Map<string, CardInfo>();
    const elo = new Map<string, number>();
    const inclusion = new Map<string, InclusionRow>();

    for (const c of candidates) {
        const base = baseOracleId(c.key);
        if (!cardInfo.has(base)) {
            cardInfo.set(base, makeCardInfo(base, c.info));
        }
        if (c.elo !== undefined) {
            elo.set(base, c.elo);
        }
        inclusion.set(c.key, { ir: [c.ir], unweighted: [c.ir], count: [1] });
    }

    const panel: Panel = { samples: [0], cubes: [], grid: [], revisions: new Map(), cardInfo, elo, unknownCards: 0 };

    return { panel, weights: [], sim: () => 0, inclusion, diffs: [], config: resolveConfig('test', configOverrides), sets: [] };
}

describe('analyzeConsensus', () => {
    it('fills color quotas via largestRemainder from the last shape point', () => {
        const shape = buildShape({ R: 0.5, U: 0.5 }, 3);
        const ctx = makeConsensusContext([]);

        const result = analyzeConsensus(ctx, shape);

        // Equal remainders break ties by original category order (W,U,B,R,...), so U gets the extra seat.
        expect(result.quotas).toEqual({ W: 0, U: 2, B: 0, R: 1, G: 0, M: 0, C: 0, L: 0 });
    });

    it('skips an excluded card entirely, including its extra copies', () => {
        const shape = buildShape({ R: 1 }, 2);
        const ctx = makeConsensusContext(
            [
                { key: 'excl', info: { name: 'Excluded Card', colorCategory: 'R' }, ir: 0.9 },
                { key: 'excl+', info: { name: 'Excluded Card', colorCategory: 'R' }, ir: 0.8 },
            ],
            { consensus: { size: null, exclude: ['excluded card'] } },
        );

        const result = analyzeConsensus(ctx, shape);

        expect(result.cards).toHaveLength(0);
        expect(result.nearMisses.R).toHaveLength(0);
    });

    it('overflows a shortage in one category to the best remaining candidate in another', () => {
        const shape = buildShape({ R: 0.5, U: 0.5 }, 2);
        const ctx = makeConsensusContext([
            { key: 'red1', info: { colorCategory: 'R' }, ir: 0.9 },
            { key: 'red2', info: { colorCategory: 'R' }, ir: 0.5 },
        ]);

        const result = analyzeConsensus(ctx, shape);

        expect(result.cards.filter((c) => c.category === 'R')).toHaveLength(2);
        expect(result.cards.filter((c) => c.category === 'U')).toHaveLength(0);
        expect(result.cards.map((c) => c.oracleId).sort()).toEqual(['red1', 'red2']);
    });

    it('fills both copies of a card when its second copy outranks other same-category cards', () => {
        const shape = buildShape({ R: 1 }, 2);
        const ctx = makeConsensusContext([
            { key: 'bolt', info: { colorCategory: 'R' }, ir: 0.9 },
            { key: 'bolt+', info: { colorCategory: 'R' }, ir: 0.8 },
            { key: 'weak', info: { colorCategory: 'R' }, ir: 0.1 },
        ]);

        const result = analyzeConsensus(ctx, shape);

        expect(result.cards.find((c) => c.oracleId === 'bolt')?.quantity).toBe(2);
        expect(result.cards.find((c) => c.oracleId === 'weak')).toBeUndefined();
    });

    it('does not select a higher-scoring second copy before its first copy is selected', () => {
        const shape = buildShape({ R: 1 }, 1);
        const ctx = makeConsensusContext([
            { key: 'bolt+', info: { colorCategory: 'R' }, ir: 0.95 },
            { key: 'otherRed', info: { colorCategory: 'R' }, ir: 0.8 },
            { key: 'bolt', info: { colorCategory: 'R' }, ir: 0.1 },
        ]);

        const result = analyzeConsensus(ctx, shape);

        expect(result.cards.map((c) => c.oracleId)).toEqual(['otherRed']);
    });
});
