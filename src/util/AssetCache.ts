import { getDb, ASSETS_STORE, _resetForTesting as _resetDbForTesting } from './CubeDb';

export interface LoadJsonAssetOptions<T> {
    /**
     * If provided AND the URL misses but the same family has a stale cached entry,
     * that stale value is returned immediately and a background fetch is fired.
     * When it resolves, the fresh value is written to IDB and this callback is invoked.
     */
    onStale?: (fresh: T) => void;
}

const KNOWN_URLS = new Set<string>();
let pruneRan = false;

export function registerKnownAssetUrl(url: string): void {
    KNOWN_URLS.add(url);
}

export async function loadJsonAsset<T>(
    url: string,
    family: string,
    options: LoadJsonAssetOptions<T> = {},
): Promise<T> {
    schedulePruneOnce();

    // Tier 1: exact URL hit.
    try {
        const db = await getDb();
        const exact = await db.get(ASSETS_STORE, url);
        if (exact) return exact.data as T;

        // Tier 2: family fallback with stale-then-fresh.
        if (options.onStale) {
            const stale = await db.getFromIndex(ASSETS_STORE, 'family', family);
            if (stale) {
                void backgroundRefetch<T>(url, family, options.onStale);
                return stale.data as T;
            }
        }
    } catch {
        // Fall through to plain fetch on any IDB failure.
    }

    // Tier 3: fetch, store, return.
    const fresh = await fetchJson<T>(url);
    void writeAsset(url, family, fresh);
    return fresh;
}

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    return res.json() as Promise<T>;
}

async function writeAsset(url: string, family: string, data: unknown): Promise<void> {
    try {
        const db = await getDb();
        await db.put(ASSETS_STORE, {
            url,
            family,
            data,
            fetchedAt: new Date().toISOString(),
        });
    } catch {
        // Best-effort; quota exhaustion or transaction abort is non-fatal.
    }
}

async function backgroundRefetch<T>(url: string, family: string, onStale: (fresh: T) => void): Promise<void> {
    try {
        const fresh = await fetchJson<T>(url);
        await writeAsset(url, family, fresh);
        onStale(fresh);
    } catch (e) {
        console.warn(`Background refresh of ${family} asset failed:`, e);
    }
}

function schedulePruneOnce(): void {
    if (pruneRan) return;
    pruneRan = true;
    void pruneUnknownAssets();
}

export async function pruneUnknownAssets(): Promise<void> {
    try {
        const db = await getDb();
        const tx = db.transaction(ASSETS_STORE, 'readwrite');
        let cursor = await tx.objectStore(ASSETS_STORE).openCursor();
        while (cursor) {
            if (!KNOWN_URLS.has(cursor.key as string)) {
                await cursor.delete();
            }
            cursor = await cursor.continue();
        }
        await tx.done;
    } catch {
        // silent
    }
}

export async function _resetForTesting(): Promise<void> {
    await _resetDbForTesting();
    KNOWN_URLS.clear();
    pruneRan = false;
}
