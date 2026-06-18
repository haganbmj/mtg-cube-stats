import { openDB, type IDBPDatabase } from 'idb';
import type { Cube } from '../types';
import { SNAPSHOT_KEY_SEPARATOR } from './Snapshots';

const DB_NAME = 'cube-cache';
const DB_VERSION = 2;
const STORE_NAME = 'cubes';

const STALE_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const EVICTION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedCube {
    id: string;
    shortId?: string;
    data: Cube;
    fetchedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                let store;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    store = store ?? db.transaction.objectStore(STORE_NAME);
                    if (!store.indexNames.contains('shortId')) {
                        store.createIndex('shortId', 'shortId', { unique: false });
                    }
                }
            },
        }).catch((err) => {
            console.warn('IndexedDB unavailable, caching disabled:', err);
            dbPromise = null;
            throw err;
        });
    }
    return dbPromise;
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

export async function _resetForTesting(): Promise<void> {
    if (dbPromise) {
        try {
            const db = await dbPromise;
            db.close();
        } catch {
            // ignore
        }
    }
    dbPromise = null;
}
