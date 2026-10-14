import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getCubeHistoryPage } from './CubeCobra';
import { loadCubeHistory, loadOlderHistory, _resetForTesting } from './CubeHistory';

vi.mock('./CubeCobra', () => ({ getCubeHistoryPage: vi.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 13);
const SINCE = NOW - 365 * DAY;

const entry = (id: string, daysAgo: number) => ({ id, date: NOW - daysAgo * DAY, cubeVersion: 1 });
const page = (changelogs: ReturnType<typeof entry>[], nextCursor?: string) => ({ cubeId: 'abc', changelogs, nextCursor });

describe('CubeHistory', () => {
    const mocked = vi.mocked(getCubeHistoryPage);

    beforeEach(async () => {
        mocked.mockReset();
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB('cube-cache');
    });

    it('pages until it passes the since boundary when nothing is cached', async () => {
        mocked
            .mockResolvedValueOnce(page([entry('a', 10), entry('b', 200)], 'c1'))
            .mockResolvedValueOnce(page([entry('c', 300), entry('d', 400)], 'c2'));

        const history = await loadCubeHistory('abc', { since: SINCE, now: NOW });

        expect(mocked).toHaveBeenCalledTimes(2);
        expect(mocked).toHaveBeenNthCalledWith(2, 'abc', 'c1');
        expect(history.entries.map(e => e.id)).toEqual(['a', 'b', 'c', 'd']);
        expect(history.olderCursor).toBe('c2');
        expect(history.exhausted).toBe(false);
    });

    it('marks history exhausted when there is no next cursor', async () => {
        mocked.mockResolvedValueOnce(page([entry('a', 10)]));

        const history = await loadCubeHistory('abc', { since: SINCE, now: NOW });

        expect(history.exhausted).toBe(true);
        expect(history.olderCursor).toBeUndefined();
    });

    it('does not refetch within the same session window', async () => {
        mocked.mockResolvedValueOnce(page([entry('a', 10)]));

        await loadCubeHistory('abc', { since: SINCE, now: NOW });
        const again = await loadCubeHistory('abc', { since: SINCE, now: NOW + 60 * 1000 });

        expect(mocked).toHaveBeenCalledTimes(1);
        expect(again.entries.map(e => e.id)).toEqual(['a']);
    });

    it('stops at the first known entry and merges with the cache', async () => {
        mocked.mockResolvedValueOnce(page([entry('a', 10), entry('b', 400)], 'c1'));
        await loadCubeHistory('abc', { since: SINCE, now: NOW });
        await _resetForTesting({ keepDb: true });

        mocked.mockResolvedValueOnce(page([entry('new', 1), entry('a', 10), entry('b', 400)], 'x'));
        const history = await loadCubeHistory('abc', { since: SINCE, now: NOW + DAY });

        expect(mocked).toHaveBeenCalledTimes(2);
        expect(history.entries.map(e => e.id)).toEqual(['new', 'a', 'b']);
        expect(history.olderCursor).toBe('c1');
    });

    it('replaces the cache when new entries do not connect to it within the window', async () => {
        mocked.mockResolvedValueOnce(page([entry('old', 400)], 'c-old'));
        await loadCubeHistory('abc', { since: SINCE, now: NOW });
        await _resetForTesting({ keepDb: true });

        mocked.mockResolvedValueOnce(page([entry('n1', 1), entry('n2', 400)], 'c-new'));
        const history = await loadCubeHistory('abc', { since: SINCE, now: NOW });

        expect(history.entries.map(e => e.id)).toEqual(['n1', 'n2']);
        expect(history.olderCursor).toBe('c-new');
    });

    it('loadOlderHistory appends one page from the stored cursor', async () => {
        mocked.mockResolvedValueOnce(page([entry('a', 400)], 'c1'));
        await loadCubeHistory('abc', { since: SINCE, now: NOW });

        mocked.mockResolvedValueOnce(page([entry('b', 500)]));
        const history = await loadOlderHistory('abc');

        expect(mocked).toHaveBeenLastCalledWith('abc', 'c1');
        expect(history.entries.map(e => e.id)).toEqual(['a', 'b']);
        expect(history.exhausted).toBe(true);
    });
});
