import type { CubeIndex, CoverageInterval, Ms } from '../types';

export function emptyIndex(cubeId: string, now: Ms): CubeIndex {
    return { cubeId, coverage: [], createdAfter: null, gaps: [], missing: false, fetchedAt: now };
}

export function resolveAt(index: CubeIndex, t: Ms): string | null | undefined {
    const hit = index.coverage.find((iv) => iv.from <= t && t <= iv.to);
    if (hit) {
        return hit.id;
    }
    if (index.createdAfter !== null && t <= index.createdAfter) {
        return null;
    }
    return undefined;
}

export function addCoverage(index: CubeIndex, id: string, from: Ms, to: Ms): CubeIndex {
    const sameId = index.coverage.filter((iv) => iv.id === id);
    const others = index.coverage.filter((iv) => iv.id !== id);
    const mergedFrom = Math.min(from, ...sameId.map((iv) => iv.from));
    const mergedTo = Math.max(to, ...sameId.map((iv) => iv.to));
    const merged: CoverageInterval = { id, from: mergedFrom, to: mergedTo };
    const gaps = index.gaps.filter((g) => g < mergedFrom || g > mergedTo);
    return { ...index, coverage: [...others, merged], gaps };
}

export function uncoveredSamples(index: CubeIndex, samples: Ms[]): Ms[] {
    return samples
        .filter((t) => resolveAt(index, t) === undefined)
        .sort((a, b) => b - a);
}
