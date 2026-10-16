import { describe, it, expect } from 'vitest';
import type { ComplexityComponents, CubeCard, KeywordCostTable } from '../types';
import {
    COMPLEXITY_COMPONENT_LABELS,
    COMPLEXITY_WEIGHTS,
    DISTINCT_KEYWORD_SIZE_EXPONENT,
    complexityBreakdownHtml,
    computeComplexityComponents,
    scoreComplexity
} from './Complexity';

let nextId = 0;
function card(overrides: Partial<CubeCard>): CubeCard {
    nextId++;
    return {
        printingId: `p${nextId}`,
        oracleId: `o${nextId}`,
        ...overrides,
    };
}

const table: KeywordCostTable = { costs: { Cascade: 40, Flying: 3 }, fallback: 10 };

const keywordCards = () => [
    card({ keywords: ['Cascade'] }),
    card({ keywords: ['Cascade'] }),
    card({ keywords: ['Flying'] }),
    card({ keywords: [] }),
];

function uniform(value: number): ComplexityComponents {
    return {
        nonLandWords: value,
        landWords: value,
        distinctKeywordLoad: value,
        keywordFrequencyLoad: value,
        familiarity: value,
        layoutLoad: value,
    };
}

const unitBounds = {
    nonLandWords: { low: 0, high: 10 },
    landWords: { low: 0, high: 10 },
    distinctKeywordLoad: { low: 0, high: 10 },
    keywordFrequencyLoad: { low: 0, high: 10 },
    familiarity: { low: 0, high: 10 },
    layoutLoad: { low: 0, high: 10 },
};

describe('computeComplexityComponents', () => {
    it('averages non-land and land word counts separately using MinusParen', () => {
        const raw = computeComplexityComponents([
            card({ effectiveTypes: ['Creature'], oracleTextWordCountMinusParen: 10, oracleTextWordCount: 999 }),
            card({ effectiveTypes: ['Instant'], oracleTextWordCountMinusParen: 20, oracleTextWordCount: 999 }),
            card({ effectiveTypes: ['Land'], oracleTextWordCountMinusParen: 6, oracleTextWordCount: 999 }),
        ], table);
        expect(raw.nonLandWords).toBe(15);
        expect(raw.landWords).toBe(6);
    });

    it('landWords is 0 when the cube has no lands', () => {
        const raw = computeComplexityComponents([
            card({ effectiveTypes: ['Creature'], oracleTextWordCountMinusParen: 12 }),
        ], table);
        expect(raw.landWords).toBe(0);
    });

    it('distinct keyword load counts each keyword once, scaled by size', () => {
        const raw = computeComplexityComponents(keywordCards(), table);
        expect(raw.distinctKeywordLoad).toBeCloseTo((40 + 3) / 4 ** DISTINCT_KEYWORD_SIZE_EXPONENT);
    });

    it('keyword frequency load averages per-card keyword cost including duplicates', () => {
        const raw = computeComplexityComponents(keywordCards(), table);
        expect(raw.keywordFrequencyLoad).toBeCloseTo((40 + 40 + 3 + 0) / 4);
    });

    it('unknown keywords use table.fallback', () => {
        const raw = computeComplexityComponents([card({ keywords: ['Zzz'] })], table);
        expect(raw.keywordFrequencyLoad).toBe(10);
    });

    it('familiarity raw is average popularity, missing counts as 0', () => {
        const raw = computeComplexityComponents([
            card({ popularity: 10 }),
            card({ popularity: undefined }),
        ], table);
        expect(raw.familiarity).toBe(5);
    });

    it('layoutLoad uses LAYOUT_WEIGHTS and 0 for unknown/ignored layouts', () => {
        const raw = computeComplexityComponents([
            card({ layout: 'transform' }),
            card({ layout: 'meld' }),
            card({ layout: 'vanguard' }),
            card({ layout: undefined }),
        ], table);
        expect(raw.layoutLoad).toBeCloseTo((0.66 + 1 + 0 + 0) / 4);
    });

    it('empty card list yields all-zero components and a finite score', () => {
        const raw = computeComplexityComponents([], table);
        expect(raw).toEqual(uniform(0));
        const { score } = scoreComplexity(raw);
        expect(Number.isFinite(score)).toBe(true);
    });
});

describe('scoreComplexity', () => {
    it('scoreComplexity normalizes, inverts familiarity, clamps, and rounds to an integer 0..100', () => {
        const weights = {
            nonLandWords: 1,
            landWords: 1,
            distinctKeywordLoad: 1,
            keywordFrequencyLoad: 1,
            familiarity: 1,
            layoutLoad: 1,
        };
        const { score, breakdown } = scoreComplexity({ ...uniform(5), familiarity: 10 }, unitBounds, weights);
        expect(breakdown.normalized.familiarity).toBe(0);
        expect(breakdown.normalized.nonLandWords).toBe(0.5);
        expect(breakdown.raw.familiarity).toBe(10);
        expect(score).toBe(Math.round(100 * 2.5 / 6));
        expect(score).toBe(42);
        expect(Number.isInteger(score)).toBe(true);

        const high = scoreComplexity({ ...uniform(50), familiarity: -50 }, unitBounds, weights);
        expect(high.breakdown.normalized).toEqual(uniform(1));
        expect(high.score).toBe(100);

        const low = scoreComplexity({ ...uniform(-50), familiarity: 50 }, unitBounds, weights);
        expect(low.breakdown.normalized).toEqual(uniform(0));
        expect(low.score).toBe(0);
    });

    it('COMPLEXITY_WEIGHTS.familiarity is the strictly lowest weight', () => {
        const { familiarity, ...others } = COMPLEXITY_WEIGHTS;
        for (const weight of Object.values(others)) {
            expect(familiarity).toBeLessThan(weight);
        }
    });
});

describe('complexityBreakdownHtml', () => {
    it('complexityBreakdownHtml lists all six labels joined by <br>', () => {
        const { breakdown } = scoreComplexity(uniform(5), unitBounds);
        const html = complexityBreakdownHtml(breakdown);
        const lines = html.split('<br>');
        expect(lines).toHaveLength(6);
        for (const label of Object.values(COMPLEXITY_COMPONENT_LABELS)) {
            expect(html).toContain(label);
        }
        expect(lines[0]).toBe(`${COMPLEXITY_COMPONENT_LABELS.nonLandWords}: 0.50 (5.0)`);
        expect(lines[4]).toBe(`${COMPLEXITY_COMPONENT_LABELS.familiarity}: 0.50 (pop 5.0%)`);
        expect(lines[5]).toBe(`${COMPLEXITY_COMPONENT_LABELS.layoutLoad}: 0.50 (5.000)`);
    });

    it('complexityBreakdownHtml prints layout raw at 3 decimals', () => {
        const { breakdown } = scoreComplexity({ ...uniform(5), layoutLoad: 0.0234 }, unitBounds);
        const lines = complexityBreakdownHtml(breakdown).split('<br>');
        expect(lines[5]).toBe(`${COMPLEXITY_COMPONENT_LABELS.layoutLoad}: 0.00 (0.023)`);
    });

    it('complexityBreakdownHtml labels unfamiliarity raw value as popularity', () => {
        const { breakdown } = scoreComplexity({ ...uniform(5), familiarity: 3.5 }, unitBounds);
        const lines = complexityBreakdownHtml(breakdown).split('<br>');
        expect(lines[4]).toBe(`${COMPLEXITY_COMPONENT_LABELS.familiarity}: 0.65 (pop 3.5%)`);
    });
});
