import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getCachedCube, setCachedCube, evictCube, isStale, pruneStaleEntries, _resetForTesting } from './CubeCache';
import type { CachedCube } from './CubeCache';
import type { Cube } from '../types';

const makeCube = (id: string): Cube => ({
    id,
    name: `Test Cube ${id}`,
    owner: 'testowner',
    cards: [
        { printingId: 'p1', oracleId: 'o1', elo: 1200, popularity: 5 },
    ],
});

describe('CubeCache', () => {
    beforeEach(async () => {
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB('cube-cache');
    });

    it('returns null for uncached cube', async () => {
        const result = await getCachedCube('nonexistent');
        expect(result).toBeNull();
    });

    it('stores and retrieves a cube', async () => {
        const cube = makeCube('abc123');
        const fetchedAt = '2026-05-30T12:00:00.000Z';

        await setCachedCube('abc123', cube, fetchedAt);
        const result = await getCachedCube('abc123');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('abc123');
        expect(result!.data.name).toBe('Test Cube abc123');
        expect(result!.fetchedAt).toBe(fetchedAt);
    });

    it('evicts a cube by ID', async () => {
        const cube = makeCube('abc123');
        await setCachedCube('abc123', cube, '2026-05-30T12:00:00.000Z');

        await evictCube('abc123');
        const result = await getCachedCube('abc123');
        expect(result).toBeNull();
    });

    it('isStale returns false for fresh entries', () => {
        const entry: CachedCube = {
            id: 'abc',
            data: makeCube('abc'),
            fetchedAt: new Date().toISOString(),
        };
        expect(isStale(entry)).toBe(false);
    });

    it('isStale returns true for entries older than 2 days', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const entry: CachedCube = {
            id: 'abc',
            data: makeCube('abc'),
            fetchedAt: threeDaysAgo,
        };
        expect(isStale(entry)).toBe(true);
    });

    it('pruneStaleEntries removes only entries older than 7 days', async () => {
        const fresh = makeCube('fresh');
        const stale = makeCube('stale');
        const ancient = makeCube('ancient');

        const now = new Date().toISOString();
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

        await setCachedCube('fresh', fresh, now);
        await setCachedCube('stale', stale, fiveDaysAgo);
        await setCachedCube('ancient', ancient, tenDaysAgo);

        await pruneStaleEntries();

        expect(await getCachedCube('fresh')).not.toBeNull();
        expect(await getCachedCube('stale')).not.toBeNull();
        expect(await getCachedCube('ancient')).toBeNull();
    });
});
