import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { getDb, _resetForTesting, DB_NAME, CUBES_STORE, ASSETS_STORE } from './CubeDb';

describe('CubeDb schema', () => {
    beforeEach(async () => {
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB(DB_NAME);
    });

    it('opens a fresh DB at v3 with both stores and their indexes', async () => {
        const db = await getDb();
        expect(db.version).toBe(3);
        expect(Array.from(db.objectStoreNames)).toEqual(expect.arrayContaining([CUBES_STORE, ASSETS_STORE]));

        const tx = db.transaction([CUBES_STORE, ASSETS_STORE], 'readonly');
        expect(Array.from(tx.objectStore(CUBES_STORE).indexNames)).toContain('shortId');
        expect(Array.from(tx.objectStore(ASSETS_STORE).indexNames)).toContain('family');
    });

    it('upgrades an existing v2 DB to v3 without dropping cube data or the shortId index', async () => {
        // Manually build a v2 DB matching what the pre-upgrade CubeCache.ts produced.
        const v2 = await openDB(DB_NAME, 2, {
            upgrade(db) {
                const store = db.createObjectStore(CUBES_STORE, { keyPath: 'id' });
                store.createIndex('shortId', 'shortId', { unique: false });
            },
        });
        await v2.put(CUBES_STORE, { id: 'cube-1', shortId: 'c1', data: { name: 'Legacy Cube' }, fetchedAt: '2026-01-01T00:00:00Z' });
        v2.close();

        // Now open via the production getDb, which should trigger the v2→v3 upgrade.
        const db = await getDb();
        expect(db.version).toBe(3);

        // Existing cube data survives.
        const cube = await db.get(CUBES_STORE, 'cube-1');
        expect(cube).toBeDefined();
        expect(cube.data.name).toBe('Legacy Cube');

        // shortId index still works.
        const byShort = await db.getFromIndex(CUBES_STORE, 'shortId', 'c1');
        expect(byShort?.id).toBe('cube-1');

        // The new assets store is created with the family index.
        expect(Array.from(db.objectStoreNames)).toContain(ASSETS_STORE);
        const assetTx = db.transaction(ASSETS_STORE, 'readonly');
        expect(Array.from(assetTx.objectStore(ASSETS_STORE).indexNames)).toContain('family');
    });

    it('upgrades a v1 DB (no shortId index) all the way to v3', async () => {
        // Simulate a pre-v2 install: cubes store exists but has no shortId index.
        const v1 = await openDB(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(CUBES_STORE, { keyPath: 'id' });
            },
        });
        await v1.put(CUBES_STORE, { id: 'cube-1', shortId: 'c1', data: { name: 'Ancient Cube' }, fetchedAt: '2026-01-01T00:00:00Z' });
        v1.close();

        const db = await getDb();
        expect(db.version).toBe(3);
        expect(Array.from(db.objectStoreNames)).toContain(ASSETS_STORE);

        // shortId index was added by the v1→v2 leg of the upgrade.
        const tx = db.transaction(CUBES_STORE, 'readonly');
        expect(Array.from(tx.objectStore(CUBES_STORE).indexNames)).toContain('shortId');
        const byShort = await db.getFromIndex(CUBES_STORE, 'shortId', 'c1');
        expect(byShort?.id).toBe('cube-1');
    });

    it('is a no-op when opened twice at the current version', async () => {
        const db1 = await getDb();
        const db2 = await getDb();
        expect(db1).toBe(db2);
        expect(db1.version).toBe(3);
    });
});
