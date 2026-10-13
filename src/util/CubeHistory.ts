import { getCubeHistoryPage, type CubeHistoryEntry } from './CubeCobra';
import { getDb, HISTORY_STORE, _resetForTesting as _resetDbForTesting } from './CubeDb';

export interface CubeHistory {
    cubeId: string;
    /** Newest first. */
    entries: CubeHistoryEntry[];
    /** Cursor for the next older page; undefined once exhausted. */
    olderCursor?: string;
    exhausted: boolean;
}

const SESSION_FRESH_MS = 10 * 60 * 1000;
const lastRefreshed = new Map<string, number>();

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `ms`. */
export function weekStartOf(ms: number): number {
    const d = new Date(ms);
    const day = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

async function readCached(cubeId: string): Promise<CubeHistory | null> {
    try {
        const db = await getDb();
        return (await db.get(HISTORY_STORE, cubeId)) ?? null;
    } catch {
        return null;
    }
}

async function writeCached(history: CubeHistory): Promise<void> {
    try {
        const db = await getDb();
        await db.put(HISTORY_STORE, history);
    } catch {
        // Best-effort cache
    }
}

/**
 * Returns a cube's changelog history covering at least `since`, fetching only
 * entries newer than what is already cached.
 */
export async function loadCubeHistory(
    cubeId: string,
    { since, now = Date.now() }: { since: number; now?: number },
): Promise<CubeHistory> {
    const cached = await readCached(cubeId);
    const refreshedAt = lastRefreshed.get(cubeId);
    if (cached && refreshedAt != null && now - refreshedAt < SESSION_FRESH_MS) {
        return cached;
    }

    const knownIds = new Set(cached?.entries.map(e => e.id) ?? []);
    const fresh: CubeHistoryEntry[] = [];
    let cursor: string | undefined;
    let connected = false;

    while (true) {
        const page = await getCubeHistoryPage(cubeId, cursor);
        for (const entry of page.changelogs) {
            if (knownIds.has(entry.id)) {
                connected = true;
                break;
            }
            fresh.push(entry);
        }
        cursor = page.nextCursor;
        if (connected || !cursor) break;
        const oldest = fresh[fresh.length - 1];
        if (oldest && oldest.date < since) break;
    }

    const history: CubeHistory = connected && cached
        ? { ...cached, entries: [...fresh, ...cached.entries] }
        : { cubeId, entries: fresh, olderCursor: cursor, exhausted: !cursor };

    await writeCached(history);
    lastRefreshed.set(cubeId, now);
    return history;
}

/** Fetches one additional page of older history from the stored cursor. */
export async function loadOlderHistory(cubeId: string): Promise<CubeHistory> {
    const cached = await readCached(cubeId);
    if (!cached || cached.exhausted || !cached.olderCursor) {
        return cached ?? { cubeId, entries: [], exhausted: true };
    }
    const page = await getCubeHistoryPage(cubeId, cached.olderCursor);
    const known = new Set(cached.entries.map(e => e.id));
    const history: CubeHistory = {
        cubeId,
        entries: [...cached.entries, ...page.changelogs.filter(e => !known.has(e.id))],
        olderCursor: page.nextCursor,
        exhausted: !page.nextCursor,
    };
    await writeCached(history);
    return history;
}

export async function _resetForTesting({ keepDb = false }: { keepDb?: boolean } = {}): Promise<void> {
    lastRefreshed.clear();
    if (!keepDb) await _resetDbForTesting();
}
