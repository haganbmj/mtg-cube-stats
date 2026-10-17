import { describe, it, expect } from 'vitest';
import type { ComplexityComponents, CubeCard, KeywordCostTable } from '../types';
import {
    COMPLEXITY_COMPONENT_KEYS,
    COMPLEXITY_COMPONENT_LABELS,
    COMPLEXITY_WEIGHTS,
    DISTINCT_KEYWORD_SIZE_EXPONENT,
    FAMILIARITY_KEYS,
    LAND_COUNTERPARTS,
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

const unitBounds = Object.fromEntries(
    COMPLEXITY_COMPONENT_KEYS.map(key => [key, { low: 0, high: 10 }]),
) as Record<keyof ComplexityComponents, { low: number; high: number }>;

const unitWeights = Object.fromEntries(
    COMPLEXITY_COMPONENT_KEYS.map(key => [key, 1]),
) as Record<keyof ComplexityComponents, number>;

function nonLandOnly(value: number): ComplexityComponents {
    return {
        nonLandWords: value,
        landWords: null,
        nonLandKeywordText: value,
        landKeywordText: null,
        nonLandFamiliarity: value,
        landFamiliarity: null,
        nonLandLayouts: value,
        landLayouts: null,
        distinctKeywordLoad: value,
    };
}

describe('computeComplexityComponents', () => {
    it('counts each distinct card once in per-card averages', () => {
        const raw = computeComplexityComponents([
            card({ oracleId: 'orni', effectiveTypes: ['Creature'], oracleTextWordCountMinusParen: 0 }),
            card({ oracleId: 'orni', effectiveTypes: ['Creature'], oracleTextWordCountMinusParen: 0 }),
            card({ oracleId: 'orni', effectiveTypes: ['Creature'], oracleTextWordCountMinusParen: 0 }),
            card({ oracleId: 'big', effectiveTypes: ['Sorcery'], oracleTextWordCountMinusParen: 30 }),
        ], table);
        expect(raw.nonLandWords).toBe(15);
    });

    it('distinct keyword load divides by total cards including copies', () => {
        const raw = computeComplexityComponents([
            card({ oracleId: 'casc', keywords: ['Cascade'] }),
            card({ oracleId: 'casc', keywords: ['Cascade'] }),
            card({ oracleId: 'fly', keywords: ['Flying'] }),
            card({ oracleId: 'plain', keywords: [] }),
        ], table);
        expect(raw.distinctKeywordLoad).toBeCloseTo((40 + 3) / 4 ** DISTINCT_KEYWORD_SIZE_EXPONENT);
    });

    it('splits keyword text by land and non-land', () => {
        const raw = computeComplexityComponents([
            card({ effectiveTypes: ['Creature'], keywords: ['Cascade'] }),
            card({ effectiveTypes: ['Creature'], keywords: [] }),
            card({ effectiveTypes: ['Land'], keywords: ['Cascade'] }),
        ], table);
        expect(raw.nonLandKeywordText).toBe(20);
        expect(raw.landKeywordText).toBe(40);
    });

    it('splits familiarity by group, missing popularity counts as 0', () => {
        const raw = computeComplexityComponents([
            card({ effectiveTypes: ['Creature'], popularity: 10 }),
            card({ effectiveTypes: ['Instant'], popularity: undefined }),
            card({ effectiveTypes: ['Land'], popularity: 4 }),
        ], table);
        expect(raw.nonLandFamiliarity).toBe(5);
        expect(raw.landFamiliarity).toBe(4);
    });

    it('splits layouts by group and counts an MDFC with a land face as a land', () => {
        const raw = computeComplexityComponents([
            card({ effectiveTypes: ['Sorcery', 'Land'], layout: 'modal_dfc' }),
            card({ effectiveTypes: ['Creature'], layout: 'transform' }),
            card({ effectiveTypes: ['Creature'], layout: 'normal' }),
        ], table);
        expect(raw.landLayouts).toBeCloseTo(0.66);
        expect(raw.nonLandLayouts).toBeCloseTo(0.33);
    });

    it('land components are null when the cube has no lands', () => {
        const raw = computeComplexityComponents([
            card({ effectiveTypes: ['Creature'], oracleTextWordCountMinusParen: 12, keywords: ['Flying'], popularity: 3 }),
        ], table);
        expect(raw.landWords).toBeNull();
        expect(raw.landKeywordText).toBeNull();
        expect(raw.landFamiliarity).toBeNull();
        expect(raw.landLayouts).toBeNull();
        expect(raw.nonLandWords).toBe(12);
        expect(raw.nonLandKeywordText).toBe(3);
        expect(raw.nonLandFamiliarity).toBe(3);
        expect(raw.nonLandLayouts).toBe(0);
    });

    it('empty cube scores a finite number', () => {
        const raw = computeComplexityComponents([], table);
        expect(raw.distinctKeywordLoad).toBe(0);
        const { score } = scoreComplexity(raw);
        expect(Number.isFinite(score)).toBe(true);
    });
});

describe('scoreComplexity', () => {
    it('scoreComplexity ignores null components and inverts both familiarity keys', () => {
        const raw = { ...nonLandOnly(5), nonLandFamiliarity: 10 };
        const { score, breakdown } = scoreComplexity(raw, unitBounds, unitWeights);
        expect(breakdown.normalized.nonLandWords).toBe(0.5);
        expect(breakdown.normalized.nonLandFamiliarity).toBe(0);
        expect(breakdown.normalized.landWords).toBeNull();
        expect(breakdown.raw.nonLandFamiliarity).toBe(10);
        expect(score).toBe(Math.round(100 * (0.5 * 4 + 0) / 5));
        expect(score).toBe(40);

        const land = scoreComplexity({ ...raw, landFamiliarity: 0 }, unitBounds, unitWeights);
        expect(land.breakdown.normalized.landFamiliarity).toBe(1);
    });

    it('familiarity weights are strictly lower than every other weight', () => {
        for (const familiarityKey of FAMILIARITY_KEYS) {
            for (const key of COMPLEXITY_COMPONENT_KEYS) {
                if (!FAMILIARITY_KEYS.includes(key)) {
                    expect(COMPLEXITY_WEIGHTS[familiarityKey]).toBeLessThan(COMPLEXITY_WEIGHTS[key]);
                }
            }
        }
    });

    it('each land weight is strictly lower than its non-land counterpart', () => {
        const entries = Object.entries(LAND_COUNTERPARTS) as [keyof ComplexityComponents, keyof ComplexityComponents][];
        expect(entries).toHaveLength(4);
        for (const [landKey, nonLandKey] of entries) {
            expect(COMPLEXITY_WEIGHTS[landKey]).toBeLessThan(COMPLEXITY_WEIGHTS[nonLandKey]);
        }
    });
});

describe('complexityBreakdownHtml', () => {
    it('complexityBreakdownHtml lists nine labelled lines and prints n/a for null', () => {
        const raw = { ...nonLandOnly(5), nonLandFamiliarity: 3.5, nonLandLayouts: 0.0234 };
        const { breakdown } = scoreComplexity(raw, unitBounds, unitWeights);
        const html = complexityBreakdownHtml(breakdown);
        const lines = html.split('<br>');
        expect(lines).toHaveLength(9);
        for (const label of Object.values(COMPLEXITY_COMPONENT_LABELS)) {
            expect(html).toContain(label);
        }
        expect(lines[0]).toBe('Non-land words: 0.50 (5.0)');
        expect(lines[1]).toBe('Land words: n/a');
        expect(lines[2]).toBe('Non-land keyword text: 0.50 (5.0)');
        expect(lines[4]).toBe('Non-land unfamiliarity: 0.65 (pop 3.5%)');
        expect(lines[6]).toBe('Non-land layouts: 0.00 (0.023)');
        expect(lines[8]).toBe('Distinct keywords: 0.50 (5.0)');
    });
});
