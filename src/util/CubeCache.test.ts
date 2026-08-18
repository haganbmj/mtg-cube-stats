import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getCachedCube, getCachedCubesBulk, setCachedCube, setCachedCubeIfNewer, evictCube, isStale, pruneStaleEntries, listCachedSnapshots, _resetForTesting } from './CubeCache';
import type { CachedCube } from './CubeCache';
import type { Cube } from '../types';

const makeCube = (id: string, shortId?: string): Cube => ({
    id,
    shortId,
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

    it('retrieves a cube by shortId', async () => {
        const cube = makeCube('abc123', 'mycube');
        await setCachedCube('abc123', cube, '2026-05-30T12:00:00.000Z');

        const result = await getCachedCube('mycube');
        expect(result).not.toBeNull();
        expect(result!.id).toBe('abc123');
        expect(result!.data.shortId).toBe('mycube');
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

    it('setCachedCubeIfNewer does not overwrite a newer existing entry', async () => {
        const cube = makeCube('abc123');
        const newerDate = '2026-05-30T12:00:00.000Z';
        const olderDate = '2026-05-25T12:00:00.000Z';

        await setCachedCube('abc123', cube, newerDate);
        await setCachedCubeIfNewer('abc123', cube, olderDate);

        const result = await getCachedCube('abc123');
        expect(result!.fetchedAt).toBe(newerDate);
    });

    it('setCachedCubeIfNewer writes when no entry exists', async () => {
        const cube = makeCube('abc123');
        const date = '2026-05-30T12:00:00.000Z';

        await setCachedCubeIfNewer('abc123', cube, date);

        const result = await getCachedCube('abc123');
        expect(result).not.toBeNull();
        expect(result!.fetchedAt).toBe(date);
    });

    it('setCachedCubeIfNewer overwrites an older existing entry', async () => {
        const cube = makeCube('abc123');
        const olderDate = '2026-05-25T12:00:00.000Z';
        const newerDate = '2026-05-30T12:00:00.000Z';

        await setCachedCube('abc123', cube, olderDate);
        await setCachedCubeIfNewer('abc123', cube, newerDate);

        const result = await getCachedCube('abc123');
        expect(result!.fetchedAt).toBe(newerDate);
    });
});

describe('CubeCache snapshot entries', () => {
    beforeEach(async () => {
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB('cube-cache');
    });

    it('round-trips a composite-key entry', async () => {
        const cube = makeCube('abc@1566534018025');
        await setCachedCube('abc@1566534018025', cube, '2026-05-30T12:00:00.000Z');
        const result = await getCachedCube('abc@1566534018025');
        expect(result).not.toBeNull();
        expect(result!.id).toBe('abc@1566534018025');
    });

    it('isStale returns false for composite-key entries regardless of age', () => {
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
        const entry: CachedCube = {
            id: 'abc@1566534018025',
            data: makeCube('abc@1566534018025'),
            fetchedAt: tenDaysAgo,
        };
        expect(isStale(entry)).toBe(false);
    });

    it('pruneStaleEntries does not evict old composite-key entries', async () => {
        const snapshot = makeCube('abc@1566534018025');
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
        await setCachedCube('abc@1566534018025', snapshot, tenDaysAgo);

        await pruneStaleEntries();

        expect(await getCachedCube('abc@1566534018025')).not.toBeNull();
    });
});

describe('listCachedSnapshots', () => {
    beforeEach(async () => {
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB('cube-cache');
    });

    const makeCube = (id: string, snapshotDate?: number) => ({
        id,
        shortId: id,
        name: 'Test Cube',
        owner: 'tester',
        ownerId: 'tester-id',
        thumbnail: '',
        cards: [],
        baseCubeId: snapshotDate ? id.split('@')[0] : undefined,
        snapshotDate,
        lastModified: new Date().toISOString(),
    } as any);

    it('returns snapshots matching the baseCubeId', async () => {
        await setCachedCube('abc@1000', makeCube('abc@1000', 1000), '2026-01-01');
        await setCachedCube('abc@2000', makeCube('abc@2000', 2000), '2026-01-01');
        await setCachedCube('xyz@1500', makeCube('xyz@1500', 1500), '2026-01-01');

        const result = await listCachedSnapshots('abc');
        expect(result.map(c => c.id).sort()).toEqual(['abc@1000', 'abc@2000']);
    });

    it('excludes plain (non-snapshot) ids that share the prefix', async () => {
        await setCachedCube('abc', makeCube('abc'), '2026-01-01');
        await setCachedCube('abc@1000', makeCube('abc@1000', 1000), '2026-01-01');

        const result = await listCachedSnapshots('abc');
        expect(result.map(c => c.id)).toEqual(['abc@1000']);
    });

    it('returns an empty array when no snapshots match', async () => {
        await setCachedCube('xyz@1000', makeCube('xyz@1000', 1000), '2026-01-01');
        const result = await listCachedSnapshots('abc');
        expect(result).toEqual([]);
    });

    it('sorts newest snapshotDate first', async () => {
        await setCachedCube('abc@1000', makeCube('abc@1000', 1000), '2026-01-01');
        await setCachedCube('abc@3000', makeCube('abc@3000', 3000), '2026-01-01');
        await setCachedCube('abc@2000', makeCube('abc@2000', 2000), '2026-01-01');

        const result = await listCachedSnapshots('abc');
        expect(result.map(c => c.id)).toEqual(['abc@3000', 'abc@2000', 'abc@1000']);
    });

    it('does not match a different baseCubeId that contains the queried id as a substring', async () => {
        await setCachedCube('abcd@1000', makeCube('abcd@1000', 1000), '2026-01-01');
        const result = await listCachedSnapshots('abc');
        expect(result).toEqual([]);
    });
});

describe('getCachedCubesBulk', () => {
    beforeEach(async () => {
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB('cube-cache');
    });

    it('returns an empty map for an empty id list', async () => {
        const result = await getCachedCubesBulk([]);
        expect(result.size).toBe(0);
    });

    it('returns a map of all requested cubes present in cache', async () => {
        await setCachedCube('a', makeCube('a'), '2026-05-30T12:00:00.000Z');
        await setCachedCube('b', makeCube('b'), '2026-05-30T12:00:00.000Z');
        await setCachedCube('c', makeCube('c'), '2026-05-30T12:00:00.000Z');

        const result = await getCachedCubesBulk(['a', 'b', 'c']);
        expect(result.size).toBe(3);
        expect(result.get('a')!.id).toBe('a');
        expect(result.get('b')!.id).toBe('b');
        expect(result.get('c')!.id).toBe('c');
    });

    it('omits ids that are not in cache', async () => {
        await setCachedCube('a', makeCube('a'), '2026-05-30T12:00:00.000Z');

        const result = await getCachedCubesBulk(['a', 'missing1', 'missing2']);
        expect(result.size).toBe(1);
        expect(result.has('a')).toBe(true);
        expect(result.has('missing1')).toBe(false);
        expect(result.has('missing2')).toBe(false);
    });

    it('resolves a shortId to its cached entry via the shortId index', async () => {
        await setCachedCube('canonical-id', makeCube('canonical-id', 'shorty'), '2026-05-30T12:00:00.000Z');

        const result = await getCachedCubesBulk(['shorty']);
        expect(result.size).toBe(1);
        expect(result.get('shorty')!.id).toBe('canonical-id');
    });

    it('handles a mix of primary-key hits, shortId hits, and misses', async () => {
        await setCachedCube('primary-1', makeCube('primary-1', 'short-1'), '2026-05-30T12:00:00.000Z');
        await setCachedCube('primary-2', makeCube('primary-2'), '2026-05-30T12:00:00.000Z');

        const result = await getCachedCubesBulk(['primary-1', 'short-1', 'primary-2', 'missing']);
        expect(result.size).toBe(3);
        expect(result.get('primary-1')!.id).toBe('primary-1');
        expect(result.get('short-1')!.id).toBe('primary-1'); // resolved via shortId
        expect(result.get('primary-2')!.id).toBe('primary-2');
        expect(result.has('missing')).toBe(false);
    });
});
