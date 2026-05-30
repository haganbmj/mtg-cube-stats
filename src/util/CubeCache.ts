import { openDB, type IDBPDatabase } from 'idb';
import type { Cube } from '../types';

const DB_NAME = 'cube-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cubes';

const STALE_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const EVICTION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedCube {
    id: string;
    data: Cube;
    fetchedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
        const entry = await db.get(STORE_NAME, id);
        return entry ?? null;
    } catch {
        return null;
    }
}

export async function setCachedCube(id: string, data: Cube, fetchedAt: string): Promise<void> {
    try {
        const db = await getDb();
        await db.put(STORE_NAME, { id, data, fetchedAt });
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
            if (age > EVICTION_THRESHOLD_MS) {
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
