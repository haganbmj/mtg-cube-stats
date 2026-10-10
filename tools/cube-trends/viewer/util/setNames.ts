import type { SetsResult } from '../../analysis/sets';

export function buildSetNameLookup(sets: SetsResult): Map<string, string> {
    return new Map([...sets.markers, ...sets.trends].map((set) => [set.code, set.name]));
}
