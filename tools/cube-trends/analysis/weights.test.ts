import { describe, it, expect } from 'vitest';
import { cosineSimilarity, suffixedDuplicates } from '../../../src/util/SimiliartyFunctions';
import { DEFAULT_CONFIG } from '../config';
import type { Ms, TrendsConfig } from '../types';
import type { Panel, PanelCube, PanelRevision } from './panel';
import { binaryCosine, createSimilarity } from './similarity';
import { computeWeights } from './weights';
import { computeInclusion } from './inclusion';

function revision(id: string, cubeId: string, date: Ms, cards: string[]): PanelRevision {
    return { id, cubeId, date, cards: new Set(cards), addedAt: new Map() };
}

function makePanel(samples: Ms[], cubes: { id: string; revisions: (string | null)[] }[], revisions: PanelRevision[]): Panel {
    const panelCubes: PanelCube[] = cubes.map((c) => ({ id: c.id, name: c.id, owner: 'owner' }));
    const grid = cubes.map((c) => c.revisions);
    const revisionsMap = new Map(revisions.map((r) => [r.id, r]));

    return {
        samples,
        cubes: panelCubes,
        grid,
        revisions: revisionsMap,
        cardInfo: new Map(),
        elo: new Map(),
        unknownCards: 0,
    };
}

describe('binaryCosine', () => {
    it('computes cosine over copy-key sets', () => {
        expect(binaryCosine(new Set(['a', 'b']), new Set(['b', 'c']))).toBe(0.5);
    });

    it('matches cosineSimilarity for suffixed duplicate lists', () => {
        const listA = suffixedDuplicates(['a', 'a', 'b']);
        const listB = suffixedDuplicates(['a', 'b']);

        expect(binaryCosine(new Set(listA), new Set(listB))).toBeCloseTo(cosineSimilarity(listA, listB));
    });

    it('returns 0 if either set is empty', () => {
        expect(binaryCosine(new Set(), new Set(['a']))).toBe(0);
        expect(binaryCosine(new Set(['a']), new Set())).toBe(0);
    });
});

describe('computeWeights', () => {
    it('applies recency decay at exactly one half-life when dedupe is off', () => {
        const halfLifeDays = 180;
        const day = 86_400_000;
        const t = 1_000_000 * day;
        const revDate = t - halfLifeDays * day;

        const panel = makePanel(
            [t],
            [{ id: 'cubeA', revisions: ['revA'] }],
            [revision('revA', 'cubeA', revDate, ['bolt'])],
        );
        const config: TrendsConfig = { ...DEFAULT_CONFIG, halfLifeDays, weighting: { recency: true, dedupe: false } };
        const sim = createSimilarity(panel);

        const weights = computeWeights(panel, config, sim);

        expect(weights[0][0]).toBeCloseTo(0.5);
    });

    it('downweights near-duplicate cubes and leaves disjoint cubes at full weight', () => {
        const panel = makePanel(
            [0],
            [
                { id: 'cubeA', revisions: ['revA'] },
                { id: 'cubeB', revisions: ['revB'] },
                { id: 'cubeC', revisions: ['revC'] },
            ],
            [
                revision('revA', 'cubeA', 0, ['bolt', 'counterspell']),
                revision('revB', 'cubeB', 0, ['bolt', 'counterspell']),
                revision('revC', 'cubeC', 0, ['shock', 'giantGrowth']),
            ],
        );
        const config: TrendsConfig = { ...DEFAULT_CONFIG, similarityTau: 0.6, weighting: { recency: false, dedupe: true } };
        const sim = createSimilarity(panel);

        const weights = computeWeights(panel, config, sim);

        expect(weights[0][0]).toBeCloseTo(0.5);
        expect(weights[1][0]).toBeCloseTo(0.5);
        expect(weights[2][0]).toBeCloseTo(1);
    });

    it('returns weight 1 for all non-null cells when both toggles are off', () => {
        const panel = makePanel(
            [0],
            [
                { id: 'cubeA', revisions: ['revA'] },
                { id: 'cubeB', revisions: [null] },
            ],
            [revision('revA', 'cubeA', 0, ['bolt'])],
        );
        const config: TrendsConfig = { ...DEFAULT_CONFIG, weighting: { recency: false, dedupe: false } };
        const sim = createSimilarity(panel);

        const weights = computeWeights(panel, config, sim);

        expect(weights[0][0]).toBe(1);
        expect(weights[1][0]).toBe(0);
    });
});

describe('computeInclusion', () => {
    it('computes weighted and unweighted inclusion rate plus raw count', () => {
        const panel = makePanel(
            [0],
            [
                { id: 'cubeA', revisions: ['revA'] },
                { id: 'cubeB', revisions: ['revB'] },
            ],
            [
                revision('revA', 'cubeA', 0, []),
                revision('revB', 'cubeB', 0, ['bolt']),
            ],
        );
        const weights = [[1], [3]];

        const inclusion = computeInclusion(panel, weights);

        expect(inclusion.get('bolt')!.ir[0]).toBeCloseTo(0.75);
        expect(inclusion.get('bolt')!.unweighted[0]).toBeCloseTo(0.5);
        expect(inclusion.get('bolt')!.count[0]).toBe(1);
    });

    // R3: more copies of a card can only raise or match inclusion of fewer copies, never exceed 1.
    it('keeps ir for a base copy key at or above its +1 copy key, both bounded by 1', () => {
        const panel = makePanel(
            [0],
            [
                { id: 'cubeA', revisions: ['revA'] },
                { id: 'cubeB', revisions: ['revB'] },
            ],
            [
                revision('revA', 'cubeA', 0, ['bolt', 'bolt+']),
                revision('revB', 'cubeB', 0, ['bolt']),
            ],
        );
        const weights = [[1], [1]];

        const inclusion = computeInclusion(panel, weights);

        const bolt = inclusion.get('bolt')!.ir[0];
        const boltPlus = inclusion.get('bolt+')!.ir[0];

        expect(bolt).toBeGreaterThanOrEqual(boltPlus);
        expect(bolt).toBeLessThanOrEqual(1);
        expect(boltPlus).toBeLessThanOrEqual(1);
    });
});
