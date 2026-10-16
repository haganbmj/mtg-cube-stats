import type { Ms } from '../types';

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export interface HttpResponse {
    status: number;
    headers: { get(name: string): string | null };
    json(): Promise<any>;
}

export interface FetcherOptions {
    concurrency: number;
    delayMs: number;
    maxRetries: number;
    request?: (url: string) => Promise<HttpResponse>;
    sleep?: (ms: number) => Promise<void>;
}

export interface CubeFetcher {
    fetchAt(cubeId: string, date: Ms): Promise<any>;
}

function defaultSleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function defaultRequest(url: string): Promise<HttpResponse> {
    return fetch(url);
}

function retryDelayMs(response: HttpResponse, attempt: number): number {
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter === null ? NaN : Number(retryAfter);
    return Number.isFinite(seconds) ? seconds * 1000 : 500 * 2 ** attempt;
}

export function createCubeFetcher(opts: FetcherOptions): CubeFetcher {
    const request = opts.request ?? defaultRequest;
    const sleep = opts.sleep ?? defaultSleep;
    const { concurrency, delayMs, maxRetries } = opts;

    // round-robin lanes: each lane serializes its own requests and remembers if it has run before (for delay spacing)
    const laneQueues: Promise<void>[] = new Array(concurrency).fill(Promise.resolve());
    const laneHasRun: boolean[] = new Array(concurrency).fill(false);
    let nextLane = 0;

    async function doFetch(cubeId: string, date: Ms): Promise<any> {
        const url = `https://cubecobra.com/cube/api/cubeJSON/${encodeURIComponent(cubeId)}?date=${date}`;
        let lastError: Error = new Error('request failed');
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            let response: HttpResponse;
            try {
                response = await request(url);
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt === maxRetries) {
                    throw lastError;
                }
                await sleep(500 * 2 ** attempt);
                continue;
            }

            if (response.status === 404) {
                throw new NotFoundError(`cube ${cubeId} not found at ${date}`);
            }
            if (response.status >= 200 && response.status < 300) {
                return response.json();
            }
            if (response.status === 429 || response.status >= 500) {
                lastError = new Error(`request failed with status ${response.status}`);
                if (attempt === maxRetries) {
                    throw lastError;
                }
                await sleep(retryDelayMs(response, attempt));
                continue;
            }
            throw new Error(`request failed with status ${response.status}`);
        }
        throw lastError;
    }

    async function runOnLane(lane: number, task: () => Promise<any>): Promise<any> {
        if (laneHasRun[lane]) {
            await sleep(delayMs);
        }
        laneHasRun[lane] = true;
        return task();
    }

    function fetchAt(cubeId: string, date: Ms): Promise<any> {
        const lane = nextLane;
        nextLane = (nextLane + 1) % concurrency;
        const result = laneQueues[lane].then(() => runOnLane(lane, () => doFetch(cubeId, date)));
        laneQueues[lane] = result.then(() => undefined, () => undefined);
        return result;
    }

    return { fetchAt };
}

export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    async function worker(): Promise<void> {
        while (index < items.length) {
            const current = index;
            index += 1;
            results[current] = await fn(items[current]);
        }
    }

    const workerCount = Math.min(limit, items.length);
    await Promise.all(new Array(workerCount).fill(null).map(() => worker()));
    return results;
}
