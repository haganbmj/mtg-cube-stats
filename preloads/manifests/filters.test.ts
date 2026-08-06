import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDuration, modifiedSince } from './filters';
import type { Cube } from '../../src/types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function cubeWith(lastModified: Cube['lastModified']): Cube {
    return {
        id: 'x',
        name: 'x',
        owner: 'x',
        cards: [],
        lastModified,
    } as Cube;
}

describe('parseDuration', () => {
    it('parses minutes', () => {
        expect(parseDuration('30m')).toBe(30 * 60 * 1000);
    });
    it('parses hours', () => {
        expect(parseDuration('4h')).toBe(4 * HOUR_MS);
    });
    it('parses days', () => {
        expect(parseDuration('1d')).toBe(DAY_MS);
    });
    it('parses months as 30 days', () => {
        expect(parseDuration('6mo')).toBe(6 * 30 * DAY_MS);
    });
    it('parses years as 365 days', () => {
        expect(parseDuration('1y')).toBe(365 * DAY_MS);
    });
    it('throws on malformed input', () => {
        expect(() => parseDuration('6months')).toThrow();
        expect(() => parseDuration('')).toThrow();
        expect(() => parseDuration('abc')).toThrow();
        expect(() => parseDuration('6')).toThrow();
    });
});

describe('modifiedSince', () => {
    const NOW = Date.parse('2026-08-06T00:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps cubes modified within the window (string date)', () => {
        const cube = cubeWith(new Date(NOW - 30 * DAY_MS).toISOString());
        expect(modifiedSince('6mo')(cube)).toBe(true);
    });

    it('keeps cubes modified within the window (numeric epoch ms)', () => {
        const cube = cubeWith(NOW - 30 * DAY_MS);
        expect(modifiedSince('6mo')(cube)).toBe(true);
    });

    it('drops cubes modified outside the window', () => {
        const cube = cubeWith(new Date(NOW - 200 * DAY_MS).toISOString());
        expect(modifiedSince('6mo')(cube)).toBe(false);
    });

    it('drops cubes with missing lastModified', () => {
        expect(modifiedSince('6mo')(cubeWith(undefined))).toBe(false);
    });

    it('drops cubes with unparseable lastModified string', () => {
        expect(modifiedSince('6mo')(cubeWith('not-a-date'))).toBe(false);
    });
});
