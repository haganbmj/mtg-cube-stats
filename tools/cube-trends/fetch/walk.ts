import type { Ms, CubeIndex, CompactRevision } from '../types';
import { emptyIndex, addCoverage, uncoveredSamples } from './coverage';
import { compactRevision } from './compact';
import type { CacheStore } from './store';
import type { CubeFetcher } from './client';
import { NotFoundError } from './client';

export interface WalkDeps {
    now: () => Ms;
    fetcher: CubeFetcher;
    store: CacheStore;
    log?: (msg: string) => void;
}

export interface WalkResult {
    index: CubeIndex;
    requests: number;
}

type FetchOutcome =
    | { status: 'ok'; rev: CompactRevision }
    | { status: 'notFound' }
    | { status: 'error' };

export async function walkCube(cubeId: string, samples: Ms[], deps: WalkDeps): Promise<WalkResult> {
    const { fetcher, store, log } = deps;
    const now = deps.now();
    let index: CubeIndex = { ...(store.readIndex(cubeId) ?? emptyIndex(cubeId, now)), fetchedAt: now };
    let requests = 0;

    async function fetchOne(date: Ms): Promise<FetchOutcome> {
        requests += 1;
        try {
            return { status: 'ok', rev: compactRevision(await fetcher.fetchAt(cubeId, date)) };
        } catch (err) {
            return { status: err instanceof NotFoundError ? 'notFound' : 'error' };
        }
    }

    // anchor fetch: proves the current revision's coverage back to its changelog date.
    const anchor = await fetchOne(now);
    if (anchor.status === 'notFound') {
        index = { ...index, missing: true };
        store.writeIndex(index);
        return { index, requests };
    }
    if (anchor.status === 'error') {
        log?.(`walkCube: "now" fetch failed for cube ${cubeId}`);
        store.writeIndex(index);
        return { index, requests };
    }
    store.writeRevision(cubeId, anchor.rev);
    index = addCoverage(index, anchor.rev.changelog.id, anchor.rev.changelog.date, now);
    store.writeIndex(index);

    const failedThisRun = new Set<Ms>();
    for (;;) {
        const [next] = uncoveredSamples(index, samples).filter((s) => !failedThisRun.has(s));
        if (next === undefined) {
            break;
        }

        const outcome = await fetchOne(next);
        if (outcome.status === 'notFound') {
            index = { ...index, missing: true };
            store.writeIndex(index);
            return { index, requests };
        }
        if (outcome.status === 'error') {
            failedThisRun.add(next);
            if (!index.gaps.includes(next)) {
                index = { ...index, gaps: [...index.gaps, next] };
            }
            store.writeIndex(index);
            continue;
        }

        store.writeRevision(cubeId, outcome.rev);
        const { id, date } = outcome.rev.changelog;
        if (date > next) {
            // response proves nothing before its own date; the sample predates the cube's creation.
            index = { ...index, createdAfter: Math.max(index.createdAfter ?? -Infinity, next) };
        } else {
            index = addCoverage(index, id, date, next);
        }
        store.writeIndex(index);
    }

    return { index, requests };
}
