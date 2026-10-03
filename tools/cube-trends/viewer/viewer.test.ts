import { describe, it, expect } from 'vitest';
import { parseHash, buildHash, type Route } from './router';
import { toCsv } from './util/csv';
import { releaseMarkLines } from './util/releaseMarkers';
import { formatCount } from './util/format';

describe('formatCount', () => {
    it('formats a cards-per-cube mean as a plain 2-decimal number, not a percent', () => {
        expect(formatCount(6.857)).toBe('6.86');
        expect(formatCount(0)).toBe('0.00');
    });
});

describe('parseHash / buildHash', () => {
    it('parses an empty hash to the overview defaults', () => {
        expect(parseHash('')).toEqual({ manifest: null, view: 'overview', card: null });
    });

    it('round-trips a route with a card param and encodes special characters', () => {
        const route: Route = { manifest: 'peasant cube', view: 'sets', card: 'abc/def?x' };
        const hash = buildHash(route);
        expect(hash).toBe('#/peasant%20cube/sets?card=abc%2Fdef%3Fx');
        expect(parseHash(hash)).toEqual(route);
    });

    it('round-trips a route without a card param', () => {
        const route: Route = { manifest: 'wotc', view: 'churn', card: null };
        expect(parseHash(buildHash(route))).toEqual(route);
    });

    it('falls back to overview for an unknown view', () => {
        expect(parseHash('#/wotc/not-a-real-view')).toEqual({ manifest: 'wotc', view: 'overview', card: null });
    });

    it('round-trips a route with a null manifest', () => {
        const route: Route = { manifest: null, view: 'overview', card: null };
        const hash = buildHash(route);
        expect(hash).toBe('#/');
        expect(parseHash(hash)).toEqual(route);
    });

    it('treats malformed percent-encoding as an absent segment instead of throwing', () => {
        expect(() => parseHash('#/wotc%/sets')).not.toThrow();
        expect(parseHash('#/wotc%/sets')).toEqual({ manifest: null, view: 'sets', card: null });
    });
});

describe('toCsv', () => {
    it('quotes cells containing commas or quotes per RFC 4180', () => {
        const csv = toCsv(
            [{ v: 'a,"b"' }],
            [{ key: 'v', label: 'V', value: (row) => row.v }],
        );
        expect(csv).toBe('V\r\n"a,""b"""');
    });

    it('prefixes cells that look like formulas to prevent CSV injection', () => {
        const csv = toCsv(
            [{ v: '=SUM(1)' }],
            [{ key: 'v', label: 'V', value: (row) => row.v }],
        );
        expect(csv).toBe("V\r\n'=SUM(1)");
    });

    it('does not prefix actual negative numbers', () => {
        const csv = toCsv(
            [{ v: -5 }],
            [{ key: 'v', label: 'V', value: (row) => row.v }],
        );
        expect(csv).toBe('V\r\n-5');
    });

    it('prefixes cells starting with a tab or carriage return to prevent CSV injection', () => {
        const csv = toCsv(
            [{ tab: '\tSUM(1)', cr: '\rSUM(1)' }],
            [
                { key: 'tab', label: 'Tab', value: (row) => row.tab },
                { key: 'cr', label: 'Cr', value: (row) => row.cr },
            ],
        );
        expect(csv).toBe('Tab,Cr\r\n\'\tSUM(1),"\'\rSUM(1)"');
    });

    it('treats empty/missing values as blank cells', () => {
        const csv = toCsv(
            [{ v: null }, { v: undefined }],
            [{ key: 'v', label: 'V', value: (row) => row.v }],
        );
        expect(csv).toBe('V\r\n\r\n');
    });
});

describe('releaseMarkLines', () => {
    it('builds an ECharts markLine config from set markers', () => {
        const result = releaseMarkLines([
            { code: 'dom', name: 'Dominaria', releasedAt: 1000 },
            { code: 'war', name: 'War of the Spark', releasedAt: 2000 },
        ]) as { symbol: string; label: { formatter: (p: { name: string }) => string }; data: { xAxis: number; name: string }[] };

        expect(result.symbol).toBe('none');
        expect(result.data).toEqual([
            { xAxis: 1000, name: 'dom' },
            { xAxis: 2000, name: 'war' },
        ]);
        expect(result.label.formatter({ name: 'dom' })).toBe('dom');
    });
});
