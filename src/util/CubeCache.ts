import type { Cube } from '../types';
import { SNAPSHOT_KEY_SEPARATOR } from './Snapshots';
import { getDb, CUBES_STORE as STORE_NAME, _resetForTesting as _resetDbForTesting } from './CubeDb';

const STALE_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const EVICTION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedCube {
    id: string;
    shortId?: string;
    data: Cube;
    fetchedAt: string;
}

export async function getCachedCube(id: string): Promise<CachedCube | null> {
    try {
        const db = await getDb();
        // Try primary key (canonical ID) first
        const entry = await db.get(STORE_NAME, id);
        if (entry) return entry;
        // Fall back to shortId index
        const byShortId = await db.getFromIndex(STORE_NAME, 'shortId', id);
        return byShortId ?? null;
    } catch {
        return null;
    }
}

/**
 * Fetch multiple cubes in a single IDB transaction. Returns a Map keyed by the
 * requested id (each requested id maps to either its entry or is absent from
 * the map). Falls back to the shortId index for ids missed by the primary key
 * lookup. Returns an empty map if IDB is unavailable.
 */
export async function getCachedCubesBulk(ids: string[]): Promise<Map<string, CachedCube>> {
    const result = new Map<string, CachedCube>();
    if (ids.length === 0) return result;
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const shortIdIndex = store.index('shortId');
        const missed: string[] = [];
        await Promise.all(ids.map(async (id) => {
            const entry = await store.get(id);
            if (entry) result.set(id, entry);
            else missed.push(id);
        }));
        await Promise.all(missed.map(async (id) => {
            const entry = await shortIdIndex.get(id);
            if (entry) result.set(id, entry);
        }));
        await tx.done;
    } catch {
        // Return whatever we managed to collect (possibly empty).
    }
    return result;
}

export async function setCachedCube(id: string, data: Cube, fetchedAt: string): Promise<void> {
    try {
        const db = await getDb();
        await db.put(STORE_NAME, { id, shortId: data.shortId, data, fetchedAt });
    } catch {
        // Silently fail — caching is best-effort
    }
}

/**
 * Store a cube in the cache only if there is no existing entry or the incoming
 * fetchedAt is newer than the stored one. Use this when persisting preload data
 * so that a user's manually-refreshed entry is not overwritten by older preload data.
 */
export async function setCachedCubeIfNewer(id: string, data: Cube, fetchedAt: string): Promise<void> {
    try {
        const db = await getDb();
        const existing = await db.get(STORE_NAME, id);
        if (existing && new Date(existing.fetchedAt).getTime() >= new Date(fetchedAt).getTime()) {
            return; // Existing entry is same age or newer — keep it
        }
        await db.put(STORE_NAME, { id, shortId: data.shortId, data, fetchedAt });
    } catch {
        // Silently fail — caching is best-effort
    }
}

export async function evictCube(id: string): Promise<void> {
    try {
        const db = await getDb();
        await db.delete(STORE_NAME, id);
    } catch {
        // Silently fail
    }
}

export function isStale(entry: CachedCube): boolean {
    if (entry.id.includes(SNAPSHOT_KEY_SEPARATOR)) return false;
    const fetchedAt = new Date(entry.fetchedAt).getTime();
    return Date.now() - fetchedAt > STALE_THRESHOLD_MS;
}

export async function pruneStaleEntries(): Promise<void> {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        let cursor = await store.openCursor();
        const now = Date.now();

        while (cursor) {
            const entry = cursor.value as CachedCube;
            const age = now - new Date(entry.fetchedAt).getTime();
            if (age > EVICTION_THRESHOLD_MS && !entry.id.includes(SNAPSHOT_KEY_SEPARATOR)) {
                await cursor.delete();
            }
            cursor = await cursor.continue();
        }

        await tx.done;
    } catch {
        // Silently fail
    }
}

export async function listCachedSnapshots(baseCubeId: string): Promise<CachedCube[]> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const prefix = `${baseCubeId}${SNAPSHOT_KEY_SEPARATOR}`;
    const matches: CachedCube[] = [];
    let cursor = await store.openCursor();
    while (cursor) {
        const entry = cursor.value as CachedCube;
        if (entry.id.startsWith(prefix)) {
            matches.push(entry);
        }
        cursor = await cursor.continue();
    }
    matches.sort((a, b) => (b.data.snapshotDate ?? 0) - (a.data.snapshotDate ?? 0));
    return matches;
}

export async function _resetForTesting(): Promise<void> {
    await _resetDbForTesting();
}
