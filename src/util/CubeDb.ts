import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'cube-cache';
export const DB_VERSION = 3;
export const CUBES_STORE = 'cubes';
export const ASSETS_STORE = 'assets';

let dbPromise: Promise<IDBPDatabase> | null = null;
let warnedOnce = false;

export function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                let cubesStore;
                if (!db.objectStoreNames.contains(CUBES_STORE)) {
                    cubesStore = db.createObjectStore(CUBES_STORE, { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    cubesStore = cubesStore ?? db.transaction.objectStore(CUBES_STORE);
                    if (!cubesStore.indexNames.contains('shortId')) {
                        cubesStore.createIndex('shortId', 'shortId', { unique: false });
                    }
                }
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains(ASSETS_STORE)) {
                        const assetsStore = db.createObjectStore(ASSETS_STORE, { keyPath: 'url' });
                        assetsStore.createIndex('family', 'family', { unique: false });
                    }
                }
            },
        }).catch((err) => {
            if (!warnedOnce) {
                console.warn('IndexedDB unavailable, caching disabled:', err);
                warnedOnce = true;
            }
            dbPromise = null;
            throw err;
        });
    }
    return dbPromise;
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
    warnedOnce = false;
}
