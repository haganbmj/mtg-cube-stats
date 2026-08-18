/**
 * Gated profiler for the preset-load hot path. Enabled by setting the Vite env
 * variable VITE_LOAD_PROFILE to any truthy value. When disabled, the flag is a
 * compile-time false and Vite tree-shakes the timing calls out of the bundle.
 *
 * Usage:
 *   VITE_LOAD_PROFILE=1 npm run dev
 *
 * or add `VITE_LOAD_PROFILE=1` to `.env.local`.
 */

export const loadProfileEnabled: boolean = !!import.meta.env.VITE_LOAD_PROFILE;

export interface LoadProfile {
    enrichCube: number;
    enrichCount: number;
    updateSim: number;
    updateSimCount: number;
    warmSim: number;
    warmSimCount: number;
    getCached: number;
    mergeMatrix: number;
    similarityLoad: number;
    checksFires: number;
    checksEvals: number;
    cubePromisesTotal: number;
}

export function makeLoadProfile(): LoadProfile {
    return {
        enrichCube: 0,
        enrichCount: 0,
        updateSim: 0,
        updateSimCount: 0,
        warmSim: 0,
        warmSimCount: 0,
        getCached: 0,
        mergeMatrix: 0,
        similarityLoad: 0,
        checksFires: 0,
        checksEvals: 0,
        cubePromisesTotal: 0,
    };
}

/**
 * Runs `fn`, adds its duration to `profile[bucket]`, and returns the result.
 * When profiling is disabled or no profile is provided, runs `fn` directly with no timing overhead.
 */
export function timed<T>(profile: LoadProfile | null | undefined, bucket: keyof LoadProfile, fn: () => T): T {
    if (!loadProfileEnabled || !profile) return fn();
    const start = performance.now();
    const result = fn();
    (profile[bucket] as number) += performance.now() - start;
    return result;
}

/** Increment a counter bucket. No-op when profiling is disabled or no profile is provided. */
export function bump(profile: LoadProfile | null | undefined, bucket: keyof LoadProfile, by: number = 1): void {
    if (!loadProfileEnabled || !profile) return;
    (profile[bucket] as number) += by;
}

/** Log the profile if profiling is enabled. */
export function reportLoadProfile(label: string, profile: LoadProfile): void {
    if (!loadProfileEnabled) return;
    console.log(`LOAD PROFILE ${label}`, JSON.stringify(profile));
}

// Module-level active profile so external hot paths (e.g. the checks watchEffect)
// can contribute counters without threading the profile through their callers.
let activeProfile: LoadProfile | null = null;

export function setActiveLoadProfile(profile: LoadProfile | null): void {
    if (!loadProfileEnabled) return;
    activeProfile = profile;
}

export function getActiveLoadProfile(): LoadProfile | null {
    return activeProfile;
}
