/**
 * Determines which of the three preset-cube sources should be used for the initial
 * render, and whether a background refresh should follow. Pure function — no IDB,
 * no network, no enrichment — so all preset-load tier behaviour can be unit-tested
 * without wiring up async infrastructure.
 *
 * Called once per preset cube by loadCollection() in App.vue.
 */

/** Minimal view of a cached IDB entry the decision needs. */
export interface CachedCubeSummary {
    /** ISO timestamp of when the cube was fetched. */
    fetchedAt: string;
    /** Result of the CubeCache isStale() check (2-day threshold). */
    isStale: boolean;
}

export type PresetCubeSource =
    /** Serve the IDB copy immediately. `refresh` decides the (optional) background source. */
    | { tier: 'cache'; refresh: 'preload' | 'live' | null }
    /** No cache; hydrate from the bundled preload JSON. */
    | { tier: 'preload' }
    /** No cache and no preload; fall back to a live CubeCobra fetch. */
    | { tier: 'live' };

export function decidePresetCubeSource(
    cached: CachedCubeSummary | null,
    preloadFetchedAt: string,
    preloadExists: boolean,
): PresetCubeSource {
    if (cached) {
        const cachedTime = new Date(cached.fetchedAt).getTime();
        const preloadTime = new Date(preloadFetchedAt).getTime();
        if (preloadTime > cachedTime && preloadExists) {
            return { tier: 'cache', refresh: 'preload' };
        }
        if (cached.isStale) {
            return { tier: 'cache', refresh: 'live' };
        }
        return { tier: 'cache', refresh: null };
    }
    if (preloadExists) {
        return { tier: 'preload' };
    }
    return { tier: 'live' };
}
