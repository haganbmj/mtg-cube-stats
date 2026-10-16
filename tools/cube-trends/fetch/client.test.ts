import { describe, it, expect, vi } from 'vitest';
import { createCubeFetcher, mapPool, NotFoundError } from './client';
import type { HttpResponse } from './client';

function makeResponse(status: number, body: any = {}, headers: Record<string, string> = {}): HttpResponse {
    return {
        status,
        headers: { get: (name: string) => headers[name] ?? null },
        json: async () => body,
    };
}

function recordingSleep(sleeps: number[]): (ms: number) => Promise<void> {
    return async (ms: number) => {
        sleeps.push(ms);
    };
}

async function flush(): Promise<void> {
    for (let i = 0; i < 10; i += 1) {
        await Promise.resolve();
    }
}

describe('createCubeFetcher', () => {
    it('retries 429 honoring Retry-After', async () => {
        const sleeps: number[] = [];
        const responses = [makeResponse(429, undefined, { 'Retry-After': '2' }), makeResponse(200, { ok: true })];
        let call = 0;
        const request = vi.fn(async () => responses[call++]);
        const fetcher = createCubeFetcher({ concurrency: 1, delayMs: 0, maxRetries: 3, request, sleep: recordingSleep(sleeps) });

        const result = await fetcher.fetchAt('cube1', 123);

        expect(result).toEqual({ ok: true });
        expect(sleeps).toContain(2000);
    });

    it('backs off exponentially on 5xx', async () => {
        const sleeps: number[] = [];
        const responses = [makeResponse(503), makeResponse(503), makeResponse(200, { ok: true })];
        let call = 0;
        const request = vi.fn(async () => responses[call++]);
        const fetcher = createCubeFetcher({ concurrency: 1, delayMs: 0, maxRetries: 3, request, sleep: recordingSleep(sleeps) });

        const result = await fetcher.fetchAt('cube1', 123);

        expect(result).toEqual({ ok: true });
        expect(sleeps).toEqual([500, 1000]);
    });

    it('gives up after maxRetries', async () => {
        const sleeps: number[] = [];
        const request = vi.fn(async () => makeResponse(500));
        const fetcher = createCubeFetcher({ concurrency: 1, delayMs: 0, maxRetries: 3, request, sleep: recordingSleep(sleeps) });

        await expect(fetcher.fetchAt('cube1', 123)).rejects.toThrow();
        expect(request).toHaveBeenCalledTimes(4);
    });

    it('404 throws NotFoundError without retry', async () => {
        const request = vi.fn(async () => makeResponse(404));
        const fetcher = createCubeFetcher({ concurrency: 1, delayMs: 0, maxRetries: 3, request, sleep: recordingSleep([]) });

        await expect(fetcher.fetchAt('cube1', 123)).rejects.toBeInstanceOf(NotFoundError);
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('throws without retry on non-retryable status codes', async () => {
        const request = vi.fn(async () => makeResponse(403));
        const fetcher = createCubeFetcher({ concurrency: 1, delayMs: 0, maxRetries: 3, request, sleep: recordingSleep([]) });

        await expect(fetcher.fetchAt('cube1', 123)).rejects.toThrow(/403/);
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('limits concurrency', async () => {
        let active = 0;
        let maxActive = 0;
        const resolvers: Array<() => void> = [];
        const request = vi.fn(() => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            return new Promise<HttpResponse>((resolve) => {
                resolvers.push(() => {
                    active -= 1;
                    resolve(makeResponse(200, {}));
                });
            });
        });
        const fetcher = createCubeFetcher({ concurrency: 2, delayMs: 0, maxRetries: 0, request, sleep: recordingSleep([]) });

        const promises = [0, 1, 2, 3, 4].map((i) => fetcher.fetchAt(`cube${i}`, 1));
        await flush();
        expect(request).toHaveBeenCalledTimes(2);

        while (resolvers.length > 0) {
            const resolveNext = resolvers.shift()!;
            resolveNext();
            await flush();
        }
        await Promise.all(promises);

        expect(maxActive).toBe(2);
        expect(request).toHaveBeenCalledTimes(5);
    });
});

describe('mapPool', () => {
    it('preserves order and limit', async () => {
        let active = 0;
        let maxActive = 0;
        const fn = async (n: number) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            await Promise.resolve();
            active -= 1;
            return n * 2;
        };

        const results = await mapPool([1, 2, 3, 4, 5], 2, fn);

        expect(results).toEqual([2, 4, 6, 8, 10]);
        expect(maxActive).toBeLessThanOrEqual(2);
    });
});
