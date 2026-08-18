import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    mergeSimilarityMatrices,
    stripToRawCube,
    onScryfallRefresh,
    _applyFreshScryfallForTesting,
    _clearScryfallRefreshListenersForTesting,
    getScryfallCards,
} from './CubeFunctions';
import type { Cube, CubeCard, ScryfallDataStructure, SimilarityMatrix, SimilarityScore } from '../types';

const score = (n: number): SimilarityScore => ({ cosineSimilarity: n, insersectionSize: 0 });

describe('mergeSimilarityMatrices', () => {
    it('returns empty for two empty inputs', () => {
        expect(mergeSimilarityMatrices({}, {})).toEqual({});
    });

    it('returns incoming when existing is empty', () => {
        const incoming: SimilarityMatrix = { a: { b: score(0.5) } };
        expect(mergeSimilarityMatrices({}, incoming)).toEqual(incoming);
    });

    it('returns existing when incoming is empty', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        expect(mergeSimilarityMatrices(existing, {})).toEqual(existing);
    });

    it('unions disjoint outer keys', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        const incoming: SimilarityMatrix = { c: { d: score(0.7) } };
        expect(mergeSimilarityMatrices(existing, incoming)).toEqual({
            a: { b: score(0.5) },
            c: { d: score(0.7) },
        });
    });

    it('merges rows for overlapping outer keys with disjoint inner keys', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        const incoming: SimilarityMatrix = { a: { c: score(0.7) } };
        expect(mergeSimilarityMatrices(existing, incoming)).toEqual({
            a: { b: score(0.5), c: score(0.7) },
        });
    });

    it('incoming wins for overlapping inner keys', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        const incoming: SimilarityMatrix = { a: { b: score(0.9) } };
        expect(mergeSimilarityMatrices(existing, incoming)).toEqual({
            a: { b: score(0.9) },
        });
    });
});

describe('stripToRawCube', () => {
    const baseMeta = {
        id: 'cube-1',
        shortId: 'c1',
        name: 'Test Cube',
        owner: 'alice',
        ownerId: 'alice-id',
        thumbnail: 'https://example.com/thumb.jpg',
        category: 'Vintage',
        categoryPrefixes: ['Powered', 'Legacy'],
        lastModified: '2026-01-01T00:00:00Z',
        followerCount: 42,
        brief: 'A test cube.',
        fetchedAt: '2026-08-17T00:00:00Z',
    };

    const enrichedRegularCard: CubeCard = {
        printingId: 'print-1',
        oracleId: 'oracle-1',
        elo: 1500,
        popularity: 0.5,
        // Enriched fields — must be dropped.
        name: 'Black Lotus',
        cmc: 0,
        colors: [],
        colorIdentity: [],
        typeLine: 'Artifact',
        effectiveTypes: ['Artifact'],
        oracleText: '{T}, Sacrifice…',
        rarity: 'rare',
        setCode: 'LEA',
        setName: 'Alpha',
        keywords: [],
        games: ['paper'],
        makesTokens: false,
        tokenOracleIds: [],
        minPriceUsd: 25000,
        urlFront: 'https://cards.example/lotus.jpg',
    };

    const enrichedCustomCard: CubeCard = {
        printingId: 'custom-card',
        oracleId: 'custom-my-token',
        elo: 1200,
        popularity: 0.1,
        // Custom overrides that must survive.
        isCustomCard: true,
        name: 'My Token',
        cmc: 3,
        colors: ['G'],
        typeLine: 'Token Creature — Beast',
        customImageUrl: 'https://example.com/mytoken.jpg',
        // Enriched fields — must be dropped.
        colorIdentity: ['G'],
        effectiveTypes: ['Token', 'Creature'],
        oracleText: '',
        setCode: 'CUSTOM',
        setName: 'Custom',
        games: ['custom'],
        makesTokens: false,
        tokenOracleIds: [],
        minPriceUsd: null,
    };

    const stripped = (cube: Cube) => stripToRawCube(cube);

    it('preserves all cube metadata fields', () => {
        const cube: Cube = { ...baseMeta, cards: [enrichedRegularCard], suffixedCardIds: ['oracle-1'] };
        const result = stripped(cube);
        for (const key of Object.keys(baseMeta) as (keyof typeof baseMeta)[]) {
            expect(result[key]).toEqual(baseMeta[key]);
        }
    });

    it('preserves suffixedCardIds', () => {
        const cube: Cube = { ...baseMeta, cards: [enrichedRegularCard], suffixedCardIds: ['oracle-1', 'oracle-1_2'] };
        expect(stripped(cube).suffixedCardIds).toEqual(['oracle-1', 'oracle-1_2']);
    });

    it('preserves snapshot fields (baseCubeId, snapshotDate)', () => {
        const cube: Cube = { ...baseMeta, id: 'cube-1@1700000000000', baseCubeId: 'cube-1', snapshotDate: 1700000000000, cards: [] };
        const result = stripped(cube);
        expect(result.baseCubeId).toBe('cube-1');
        expect(result.snapshotDate).toBe(1700000000000);
    });

    it('preserves hidden flag', () => {
        const cube: Cube = { ...baseMeta, hidden: true, cards: [] };
        expect(stripped(cube).hidden).toBe(true);
    });

    it('strips enriched fields from regular cards, keeping only raw properties', () => {
        const cube: Cube = { ...baseMeta, cards: [enrichedRegularCard] };
        const [card] = stripped(cube).cards;
        expect(card).toEqual({
            printingId: 'print-1',
            oracleId: 'oracle-1',
            elo: 1500,
            popularity: 0.5,
        });
    });

    it('strips enriched fields from custom cards while preserving override fields', () => {
        const cube: Cube = { ...baseMeta, cards: [enrichedCustomCard] };
        const [card] = stripped(cube).cards;
        expect(card).toEqual({
            printingId: 'custom-card',
            oracleId: 'custom-my-token',
            isCustomCard: true,
            name: 'My Token',
            cmc: 3,
            colors: ['G'],
            typeLine: 'Token Creature — Beast',
            customImageUrl: 'https://example.com/mytoken.jpg',
            elo: 1200,
            popularity: 0.1,
        });
    });

    it('is idempotent — stripping an already-stripped cube produces the same shape', () => {
        const cube: Cube = { ...baseMeta, cards: [enrichedRegularCard, enrichedCustomCard] };
        expect(stripped(stripped(cube))).toEqual(stripped(cube));
    });

    it('handles cubes with mixed regular and custom cards', () => {
        const cube: Cube = { ...baseMeta, cards: [enrichedRegularCard, enrichedCustomCard] };
        const result = stripped(cube);
        expect(result.cards).toHaveLength(2);
        expect(result.cards[0].isCustomCard).toBeUndefined();
        expect(result.cards[1].isCustomCard).toBe(true);
    });
});

describe('onScryfallRefresh', () => {
    const makeScryfall = (marker: string): ScryfallDataStructure => ({
        cards: { [marker]: { name: marker } as any },
        tokens: {},
        sets: {},
        setDates: {},
    });

    beforeEach(() => {
        _clearScryfallRefreshListenersForTesting();
    });

    it('invokes registered listeners when fresh data lands', () => {
        const listener = vi.fn();
        onScryfallRefresh(listener);

        _applyFreshScryfallForTesting(makeScryfall('a'));

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('invokes multiple listeners in registration order', () => {
        const calls: string[] = [];
        onScryfallRefresh(() => calls.push('first'));
        onScryfallRefresh(() => calls.push('second'));
        onScryfallRefresh(() => calls.push('third'));

        _applyFreshScryfallForTesting(makeScryfall('a'));

        expect(calls).toEqual(['first', 'second', 'third']);
    });

    it('returned unsubscribe removes the listener', () => {
        const listener = vi.fn();
        const unsubscribe = onScryfallRefresh(listener);

        unsubscribe();
        _applyFreshScryfallForTesting(makeScryfall('a'));

        expect(listener).not.toHaveBeenCalled();
    });

    it('a throwing listener does not prevent later listeners from running', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const later = vi.fn();
        onScryfallRefresh(() => { throw new Error('boom'); });
        onScryfallRefresh(later);

        expect(() => _applyFreshScryfallForTesting(makeScryfall('a'))).not.toThrow();
        expect(later).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('swaps the module-level Scryfall data before notifying listeners', () => {
        const observed: Record<string, unknown>[] = [];
        onScryfallRefresh(() => {
            observed.push(getScryfallCards());
        });

        _applyFreshScryfallForTesting(makeScryfall('marker-a'));
        _applyFreshScryfallForTesting(makeScryfall('marker-b'));

        expect(Object.keys(observed[0])).toContain('marker-a');
        expect(Object.keys(observed[1])).toContain('marker-b');
    });
});
