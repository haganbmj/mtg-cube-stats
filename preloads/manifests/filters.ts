import type { Cube } from '../../src/types';
import type { CubePredicate } from './types';

const UNIT_MS: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    mo: 30 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
};

export function parseDuration(input: string): number {
    const match = /^(\d+)(mo|m|h|d|y)$/.exec(input);
    if (!match) throw new Error(`Invalid duration: "${input}"`);
    const value = Number.parseInt(match[1], 10);
    return value * UNIT_MS[match[2]];
}

function parseLastModified(value: Cube['lastModified']): number | null {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export function modifiedSince(duration: string): CubePredicate {
    const windowMs = parseDuration(duration);
    return (cube) => {
        const ts = parseLastModified(cube.lastModified);
        if (ts == null) return false;
        return (Date.now() - ts) <= windowMs;
    };
}
