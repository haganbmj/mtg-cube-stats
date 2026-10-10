import { describe, it, expect, vi } from 'vitest';
import type { Ms, CubeIndex, CompactRevision } from '../types';
import { emptyIndex, resolveAt } from './coverage';
import type { CacheStore } from './store';
import type { CubeFetcher } from './client';
import { NotFoundError } from './client';
import * as compact from './compact';
import { walkCube } from './walk';
import { sampleDates } from './sampling';

const D = (n: number): Ms => n * 86_400_000;

interface TimelineEntry {
    id: string;
    date: Ms;
}

function rawRevision(id: string, date: Ms): any {
    return { id: 'cube', changelog: { id, date }, cards: { mainboard: [] } };
}

function createTimelineFetcher(timeline: TimelineEntry[], opts: { throwAt?: Ms[]; notFoundAt?: Ms[] } = {}): CubeFetcher {
    const sorted = [...timeline].sort((a, b) => a.date - b.date);
    const throwAt = new Set(opts.throwAt ?? []);
    const notFoundAt = new Set(opts.notFoundAt ?? []);
    return {
        async fetchAt(_cubeId: string, date: Ms): Promise<any> {
            if (notFoundAt.has(date)) {
                throw new NotFoundError('not found');
            }
            if (throwAt.has(date)) {
                throw new Error('simulated failure');
            }
            const atOrBefore = sorted.filter((entry) => entry.date <= date);
            const entry = atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : sorted[0];
            return rawRevision(entry.id, entry.date);
        },
    };
}

function createMemoryStore(): CacheStore {
    const indexes = new Map<string, CubeIndex>();
    const revisions = new Map<string, CompactRevision>();
    return {
        readIndex: (cubeId) => indexes.get(cubeId) ?? null,
        writeIndex: vi.fn((index: CubeIndex) => {
            indexes.set(index.cubeId, index);
        }),
        hasRevision: (cubeId, id) => revisions.has(`${cubeId}:${id}`),
        readRevision: (cubeId, id) => {
            const rev = revisions.get(`${cubeId}:${id}`);
            if (!rev) {
                throw new Error(`missing revision ${id}`);
            }
            return rev;
        },
        writeRevision: (cubeId, rev) => {
            revisions.set(`${cubeId}:${rev.changelog.id}`, rev);
        },
    };
}

const TIMELINE: TimelineEntry[] = [
    { id: 'r1', date: D(10) },
    { id: 'r2', date: D(40) },
    { id: 'r3', date: D(70) },
];

function tenSamples(): Ms[] {
    return Array.from({ length: 10 }, (_, i) => D(i * 10));
}

describe('walkCube', () => {
    it('covers all samples with one request per revision', async () => {
        const fetcher = createTimelineFetcher(TIMELINE);
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.requests).toBe(4);
        expect(resolveAt(result.index, D(10))).toBe('r1');
        expect(resolveAt(result.index, D(30))).toBe('r1');
        expect(resolveAt(result.index, D(40))).toBe('r2');
        expect(resolveAt(result.index, D(60))).toBe('r2');
        expect(resolveAt(result.index, D(70))).toBe('r3');
        expect(resolveAt(result.index, D(90))).toBe('r3');
        expect(result.index.createdAfter).toBe(D(0));
    });

    it('fetches between known revisions rather than assuming', async () => {
        const base = createTimelineFetcher(TIMELINE);
        const calls: Ms[] = [];
        const fetcher: CubeFetcher = {
            fetchAt: (cubeId, date) => {
                calls.push(date);
                return base.fetchAt(cubeId, date);
            },
        };
        const store = createMemoryStore();
        store.writeIndex({
            ...emptyIndex('cube', D(95)),
            coverage: [{ id: 'r3', from: D(70), to: D(95) }, { id: 'r1', from: D(10), to: D(30) }],
        });

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(calls).toContain(D(60));
        expect(resolveAt(result.index, D(50))).toBe('r2');
    });

    it('unchanged cube = one request', async () => {
        const fetcher = createTimelineFetcher(TIMELINE);
        const store = createMemoryStore();
        store.writeIndex({
            ...emptyIndex('cube', D(95)),
            createdAfter: D(0),
            coverage: [
                { id: 'r1', from: D(10), to: D(30) },
                { id: 'r2', from: D(40), to: D(60) },
                { id: 'r3', from: D(70), to: D(95) },
            ],
        });

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.requests).toBe(1);
    });

    it('persists index after each request', async () => {
        const fetcher = createTimelineFetcher(TIMELINE);
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(store.writeIndex).toHaveBeenCalledTimes(result.requests);
    });

    it('records gaps and continues', async () => {
        const fetcher = createTimelineFetcher(TIMELINE, { throwAt: [D(60)] });
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.index.gaps).toEqual([D(60)]);
        expect(resolveAt(result.index, D(40))).toBe('r2');
        expect(resolveAt(result.index, D(70))).toBe('r3');
    });

    it('marks missing on 404 and stops', async () => {
        const fetcher = createTimelineFetcher(TIMELINE, { notFoundAt: [D(95)] });
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.index.missing).toBe(true);
        expect(result.requests).toBe(1);
    });

    it('clears missing once a later anchor fetch succeeds', async () => {
        const fetcher = createTimelineFetcher(TIMELINE);
        const store = createMemoryStore();
        store.writeIndex({ ...emptyIndex('cube', D(95)), missing: true });

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.index.missing).toBe(false);
    });

    it('anchor fetch failure records no gap', async () => {
        const fetcher = createTimelineFetcher(TIMELINE, { throwAt: [D(95)] });
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.requests).toBe(1);
        expect(result.index.gaps).toEqual([]);
        expect(result.index.missing).toBe(false);
        expect(result.index.coverage).toEqual([]);
        expect(store.writeIndex).toHaveBeenCalledTimes(1);
        expect(result.anchorFailed).toBe(true);
    });

    it('does not report anchorFailed on a 404 anchor', async () => {
        const fetcher = createTimelineFetcher(TIMELINE, { notFoundAt: [D(95)] });
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.index.missing).toBe(true);
        expect(result.anchorFailed).toBe(false);
    });

    it('does not report anchorFailed when the anchor fetch succeeds', async () => {
        const fetcher = createTimelineFetcher(TIMELINE);
        const store = createMemoryStore();

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        expect(result.anchorFailed).toBe(false);
    });

    it('adds a sample to gaps and keeps progressing when its response fails to cover it', async () => {
        const fetcher = createTimelineFetcher(TIMELINE);
        const store = createMemoryStore();
        const original = compact.compactRevision;
        // Simulate a response that passes compaction but, through some inconsistency, never ends up
        // covering the sample it was fetched for — the loop must not retry it forever.
        const spy = vi.spyOn(compact, 'compactRevision').mockImplementation((raw: any) => {
            const rev = original(raw);
            return rev.changelog.date === D(40) ? { ...rev, changelog: { ...rev.changelog, date: NaN } } : rev;
        });

        const result = await walkCube('cube', tenSamples(), { now: () => D(95), fetcher, store });

        spy.mockRestore();
        expect(result.index.gaps).toContain(D(40));
        expect(resolveAt(result.index, D(40))).toBeUndefined();
    });
});

describe('walkCube with a stable grid', () => {
    it('reuses coverage from a coarser-grid walk, fetching only new finer-grid dates not already proven', async () => {
        const now = Date.UTC(2026, 9, 3); // GRID_EPOCH
        const timeline: TimelineEntry[] = [
            { id: 'r1', date: Date.UTC(2026, 8, 1) },
            { id: 'r2', date: Date.UTC(2026, 8, 25) },
            { id: 'r3', date: now },
        ];
        const range = 28 * 86_400_000;
        const fetcher = createTimelineFetcher(timeline);
        const store = createMemoryStore();

        const biweekly = sampleDates(now, 14 * 86_400_000, range);
        await walkCube('cube', biweekly, { now: () => now, fetcher, store });

        const calls: Ms[] = [];
        const trackingFetcher: CubeFetcher = {
            fetchAt: (cubeId, date) => {
                calls.push(date);
                return fetcher.fetchAt(cubeId, date);
            },
        };
        const weekly = sampleDates(now, 7 * 86_400_000, range);
        const newOnly = weekly.filter((d) => !biweekly.includes(d));
        expect(newOnly).toEqual([Date.UTC(2026, 8, 12), Date.UTC(2026, 8, 26)]);

        const result = await walkCube('cube', weekly, { now: () => now, fetcher: trackingFetcher, store });

        // the anchor ('now') is always re-fetched; Sep 12 is already inside r1's proven interval from
        // the biweekly walk, so only Sep 26 (outside any proven interval) should trigger a request.
        expect(calls).toEqual([now, Date.UTC(2026, 8, 26)]);
        for (const d of biweekly) {
            if (d !== now) {
                expect(calls).not.toContain(d);
            }
        }
        for (const d of weekly) {
            expect(resolveAt(result.index, d)).not.toBeUndefined();
        }
    });
});

