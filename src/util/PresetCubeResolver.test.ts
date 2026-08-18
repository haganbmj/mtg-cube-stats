import { describe, it, expect } from 'vitest';
import { decidePresetCubeSource } from './PresetCubeResolver';

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('decidePresetCubeSource', () => {
    describe('with an IDB cache hit', () => {
        it('serves cache with no refresh when preload is older/equal and cache is fresh', () => {
            const cachedFetchedAt = isoDaysAgo(1);
            const preloadFetchedAt = isoDaysAgo(3);
            expect(decidePresetCubeSource(
                { fetchedAt: cachedFetchedAt, isStale: false },
                preloadFetchedAt,
                true,
            )).toEqual({ tier: 'cache', refresh: null });
        });

        it('background-refreshes from preload when preload is newer than cache', () => {
            const cachedFetchedAt = isoDaysAgo(3);
            const preloadFetchedAt = isoDaysAgo(1);
            expect(decidePresetCubeSource(
                { fetchedAt: cachedFetchedAt, isStale: false },
                preloadFetchedAt,
                true,
            )).toEqual({ tier: 'cache', refresh: 'preload' });
        });

        it('does NOT refresh from preload when the newer preload JSON is unavailable', () => {
            const cachedFetchedAt = isoDaysAgo(3);
            const preloadFetchedAt = isoDaysAgo(1);
            expect(decidePresetCubeSource(
                { fetchedAt: cachedFetchedAt, isStale: false },
                preloadFetchedAt,
                false, // preload file missing
            )).toEqual({ tier: 'cache', refresh: null });
        });

        it('background-refreshes from CubeCobra when cache is stale and preload is not newer', () => {
            const cachedFetchedAt = isoDaysAgo(3);
            const preloadFetchedAt = isoDaysAgo(5);
            expect(decidePresetCubeSource(
                { fetchedAt: cachedFetchedAt, isStale: true },
                preloadFetchedAt,
                true,
            )).toEqual({ tier: 'cache', refresh: 'live' });
        });

        it('prefers a preload refresh over a live refresh when both would apply', () => {
            const cachedFetchedAt = isoDaysAgo(5);
            const preloadFetchedAt = isoDaysAgo(1);
            expect(decidePresetCubeSource(
                { fetchedAt: cachedFetchedAt, isStale: true },
                preloadFetchedAt,
                true,
            )).toEqual({ tier: 'cache', refresh: 'preload' });
        });

        it('treats equal timestamps as no refresh (cache is at least as fresh)', () => {
            const ts = isoDaysAgo(1);
            expect(decidePresetCubeSource(
                { fetchedAt: ts, isStale: false },
                ts,
                true,
            )).toEqual({ tier: 'cache', refresh: null });
        });
    });

    describe('with no IDB cache', () => {
        it('hydrates from the preload JSON when available', () => {
            expect(decidePresetCubeSource(null, isoDaysAgo(1), true)).toEqual({ tier: 'preload' });
        });

        it('falls back to a live CubeCobra fetch when no preload exists', () => {
            expect(decidePresetCubeSource(null, isoDaysAgo(1), false)).toEqual({ tier: 'live' });
        });
    });
});
