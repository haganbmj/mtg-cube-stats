import { describe, it, expect } from 'vitest';
import { VIEWS, VIEW_LABELS, parseHash, buildHash, type Route } from './router';
import { toCsv } from './util/csv';
import { releaseMarkLines } from './util/releaseMarkers';
import { buildAddsRemovesOption } from './util/charts';
import { buildCardTimeline } from './util/cardTimeline';
import type { TimelinePoint } from '../analysis/timeline';
import type { CardTrend } from '../analysis/cards';
import { formatCount } from './util/format';
import { compareNullable, byName } from './util/sort';

function makeTrend(copy: number, cubesPresent: number[][]): CardTrend {
    return {
        key: copy === 1 ? 'card' : `card${'+'.repeat(copy - 1)}`,
        copy,
        info: {
            oracleId: 'card',
            name: 'Card',
            urlFront: '',
            colors: [],
            colorCategory: 'C',
            primaryType: 'Creature',
            cmc: 0,
            isBasic: false,
            eligibility: null,
        },
        ir: [],
        unweighted: [],
        count: [],
        cubesPresent,
        current: 0,
        peak: 0,
        firstSeen: null,
        lastSeen: null,
        momentum: null,
        delta: null,
    };
}

describe('formatCount', () => {
    it('formats a cards-per-cube mean as a plain 2-decimal number, not a percent', () => {
        expect(formatCount(6.857)).toBe('6.86');
        expect(formatCount(0)).toBe('0.00');
    });
});

describe('VIEW_LABELS', () => {
    it('has a Title Case label for every view', () => {
        for (const view of VIEWS) {
            expect(VIEW_LABELS[view]).toBeTruthy();
            expect(VIEW_LABELS[view][0]).toBe(VIEW_LABELS[view][0].toUpperCase());
        }
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
        ]) as { symbol: string; lineStyle: { color: string; type: string }; label: { formatter: (p: { name: string }) => string; color: string }; data: { xAxis: number; name: string }[] };

        expect(result.symbol).toBe('none');
        expect(result.lineStyle.color).toBe('#909399');
        expect(result.lineStyle.type).toBe('dashed');
        expect(result.label.color).toBe('#909399');
        expect(result.data).toEqual([
            { xAxis: 1000, name: 'dom' },
            { xAxis: 2000, name: 'war' },
        ]);
        expect(result.label.formatter({ name: 'dom' })).toBe('dom');
    });

    it('merges sets released on the same date into one marker', () => {
        const result = releaseMarkLines([
            { code: 'msh', name: 'Marvel Super Heroes', releasedAt: 3000 },
            { code: 'dom', name: 'Dominaria', releasedAt: 1000 },
            { code: 'msc', name: 'Marvel Super Heroes Commander', releasedAt: 3000 },
        ]) as { data: { xAxis: number; name: string }[]; tooltip: { formatter: (p: { name: string }) => string } };

        expect(result.data).toEqual([
            { xAxis: 1000, name: 'dom' },
            { xAxis: 3000, name: 'msh/msc' },
        ]);
        expect(result.tooltip.formatter({ name: 'msh/msc' }))
            .toBe('Marvel Super Heroes (msh), Marvel Super Heroes Commander (msc)');
    });
});

describe('buildAddsRemovesOption', () => {
    it('stacks Adds/Removes with distinct colors and negates removes values', () => {
        const points: TimelinePoint[] = [
            { t: 1000, adds: 5, removes: 3 } as TimelinePoint,
            { t: 2000, adds: 2, removes: 7 } as TimelinePoint,
        ];
        const option = buildAddsRemovesOption(
            points,
            [{ code: 'dom', name: 'Dominaria', releasedAt: 1000 }],
        ) as { series: { name: string; stack: string; itemStyle: { color: string }; data: [number, number][] }[] };

        const [addsSeries, removesSeries] = option.series;

        expect(addsSeries.stack).toBe('changes');
        expect(removesSeries.stack).toBe('changes');
        expect(addsSeries.itemStyle.color).toBe('#67C23A');
        expect(removesSeries.itemStyle.color).toBe('#F56C6C');
        expect(removesSeries.data.every(([, value]) => value <= 0)).toBe(true);
    });
});

describe('compareNullable', () => {
    it('sorts numbers ascending', () => {
        expect(compareNullable(1, 2)).toBeLessThan(0);
        expect(compareNullable(2, 1)).toBeGreaterThan(0);
        expect(compareNullable(1, 1)).toBe(0);
    });

    it('treats null/undefined as -Infinity so they sort first ascending', () => {
        expect(compareNullable(null, 1)).toBeLessThan(0);
        expect(compareNullable(undefined, 1)).toBeLessThan(0);
        expect(compareNullable(1, null)).toBeGreaterThan(0);
        expect(compareNullable(null, undefined)).toBe(0);
    });
});

describe('byName', () => {
    it('compares case-insensitively', () => {
        expect(byName('apple', 'Banana')).toBeLessThan(0);
        expect(byName('Banana', 'apple')).toBeGreaterThan(0);
        expect(byName('Apple', 'apple')).toBe(0);
    });
});

describe('buildCardTimeline', () => {
    const samples = [0, 1000, 2000];
    const cubes = [
        { id: 'c1', name: 'Cube One', owner: 'Alice' },
        { id: 'c2', name: 'Cube Two', owner: 'Bob' },
        { id: 'c3', name: 'Cube Three', owner: 'Carol' },
        { id: 'c4', name: 'Cube Four', owner: 'Dave' },
    ];

    // c1 present throughout, c2 added mid-window, c3 removed before the last sample, c4 never present.
    const copy1 = makeTrend(1, [[0, 2], [0, 1, 2], [0, 1]]);
    // c1 has a second copy only at the last sample; c2 never picks up a second copy.
    const copy2 = makeTrend(2, [[], [0], [0]]);

    it('marks a cube present at every sample as current with no window flags', () => {
        const rows = buildCardTimeline([copy1, copy2], samples, cubes);
        const row = rows.find((r) => r.cubeId === 'c1')!;
        expect(row.firstSeen).toBe(0);
        expect(row.lastSeen).toBe(2000);
        expect(row.current).toBe(true);
        expect(row.addedInWindow).toBe(false);
        expect(row.removedInWindow).toBe(false);
    });

    it('flags a cube absent at the first sample as added in window', () => {
        const rows = buildCardTimeline([copy1, copy2], samples, cubes);
        const row = rows.find((r) => r.cubeId === 'c2')!;
        expect(row.firstSeen).toBe(1000);
        expect(row.lastSeen).toBe(2000);
        expect(row.current).toBe(true);
        expect(row.addedInWindow).toBe(true);
        expect(row.removedInWindow).toBe(false);
    });

    it('flags a cube absent at the last sample as removed', () => {
        const rows = buildCardTimeline([copy1, copy2], samples, cubes);
        const row = rows.find((r) => r.cubeId === 'c3')!;
        expect(row.firstSeen).toBe(0);
        expect(row.lastSeen).toBe(1000);
        expect(row.current).toBe(false);
        expect(row.addedInWindow).toBe(false);
        expect(row.removedInWindow).toBe(true);
    });

    it('counts copies at the latest sample across all copy keys', () => {
        const rows = buildCardTimeline([copy1, copy2], samples, cubes);
        expect(rows.find((r) => r.cubeId === 'c1')!.copiesLatest).toBe(2);
        expect(rows.find((r) => r.cubeId === 'c2')!.copiesLatest).toBe(1);
        expect(rows.find((r) => r.cubeId === 'c3')!.copiesLatest).toBe(0);
    });

    it('excludes a cube that never held copy 1', () => {
        const rows = buildCardTimeline([copy1, copy2], samples, cubes);
        expect(rows.find((r) => r.cubeId === 'c4')).toBeUndefined();
    });

    it('returns no rows when there are no samples', () => {
        expect(buildCardTimeline([copy1], [], cubes)).toEqual([]);
    });
});
