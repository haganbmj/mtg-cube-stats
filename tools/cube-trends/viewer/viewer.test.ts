import { describe, it, expect } from 'vitest';
import { VIEWS, VIEW_LABELS, parseHash, buildHash, type Route } from './router';
import { toCsv } from './util/csv';
import { releaseMarkLines } from './util/releaseMarkers';
import { buildAddsRemovesOption, buildCubesUpdated, buildCubesUpdatedOption } from './util/charts';
import { buildCardTimeline } from './util/cardTimeline';
import type { TimelinePoint } from '../analysis/timeline';
import type { ChurnResult, CubeChurn } from '../analysis/churn';
import type { CardTrend } from '../analysis/cards';
import { formatCount, formatPercentTooltip, formatWeeks, formatYears, daysToWeeks, daysToYears, bandTooltip, axisTooltip, formatDate } from './util/format';
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

describe('formatPercentTooltip', () => {
    it('formats a 0-1 fraction as a percent with at most 2 decimals, trailing zeros trimmed', () => {
        expect(formatPercentTooltip(0.12345)).toBe('12.35%');
        expect(formatPercentTooltip(0.125)).toBe('12.5%');
        expect(formatPercentTooltip(0.5)).toBe('50%');
        expect(formatPercentTooltip(0)).toBe('0%');
    });

    it('returns an em dash for null, undefined, or NaN', () => {
        expect(formatPercentTooltip(null)).toBe('—');
        expect(formatPercentTooltip(undefined)).toBe('—');
        expect(formatPercentTooltip(NaN)).toBe('—');
    });
});

describe('formatWeeks / formatYears', () => {
    it('formats weeks with one decimal and converts days to weeks', () => {
        expect(formatWeeks(12.44)).toBe('12.4 weeks');
        expect(formatWeeks(1)).toBe('1.0 week');
        expect(formatWeeks(daysToWeeks(87))).toBe('12.4 weeks');
    });

    it('formats years with one decimal and converts days to years', () => {
        expect(formatYears(4.89)).toBe('4.9 years');
        expect(formatYears(daysToYears(1786))).toBe('4.9 years');
    });

    it('returns an em dash for null', () => {
        expect(formatWeeks(null)).toBe('—');
        expect(formatYears(null)).toBe('—');
    });
});

describe('bandTooltip', () => {
    it('renders a date header, present line series (skipping nulls), and the band row', () => {
        const formatter = bandTooltip({
            lines: [
                { seriesName: 'Median', format: (v) => String(Math.round(v)) },
                { seriesName: 'Missing', format: (v) => String(v) },
            ],
            band: {
                q1: (index) => [10, 20][index],
                q3: (index) => [15, 25][index],
                format: (v) => String(Math.round(v)),
            },
        });

        const params = [
            { seriesName: 'Q1', marker: '<q1-marker>', value: [1000, 10], dataIndex: 0, axisValue: 1000 },
            { seriesName: 'IQR', marker: '<iqr-marker>', value: [1000, 5], dataIndex: 0, axisValue: 1000 },
            { seriesName: 'Median', marker: '<median-marker>', value: [1000, 12.4], dataIndex: 0, axisValue: 1000 },
            { seriesName: 'Missing', marker: '<missing-marker>', value: [1000, null], dataIndex: 0, axisValue: 1000 },
        ];

        expect(formatter(params)).toBe(
            `${formatDate(1000)}<br/><median-marker>Median: 12<br/>25th–75th pct: 10 – 15`,
        );
    });

    it('omits the band row when q1 or q3 is null at that index', () => {
        const formatter = bandTooltip({
            lines: [{ seriesName: 'Mean', format: (v) => String(v) }],
            band: {
                q1: () => null,
                q3: () => 5,
                format: (v) => String(v),
            },
        });

        const params = [{ seriesName: 'Mean', marker: '<mean-marker>', value: [1000, 3], dataIndex: 0, axisValue: 1000 }];

        expect(formatter(params)).toBe(`${formatDate(1000)}<br/><mean-marker>Mean: 3`);
    });
});

describe('axisTooltip', () => {
    it('renders a header from the axis value and one row per present series, skipping nulls', () => {
        const formatter = axisTooltip((x) => `Day ${Math.round(x)}`, (v) => `${v}%`);

        const params = [
            { seriesName: 'Overall', marker: '<overall-marker>', value: [1802.27, 42], dataIndex: 0, axisValue: 1802.27 },
            { seriesName: 'Established', marker: '<established-marker>', value: [1802.27, null], dataIndex: 0, axisValue: 1802.27 },
        ];

        expect(formatter(params)).toBe('Day 1802<br/><overall-marker>Overall: 42%');
    });

    it('reads plain (non-pair) values directly', () => {
        const formatter = axisTooltip((x) => `Week ${Math.round(x)}`, (v) => String(v));

        const params = [{ seriesName: 'Series', marker: '<marker>', value: 30, dataIndex: 0, axisValue: 30 }];

        expect(formatter(params)).toBe('Week 30<br/><marker>Series: 30');
    });

    it('orders rows by value descending when sortDesc is set', () => {
        const formatter = axisTooltip((x) => `Week ${x}`, (v) => String(v), { sortDesc: true });

        const params = [
            { seriesName: 'A', marker: '', value: [30, 1.5], dataIndex: 0, axisValue: 30 },
            { seriesName: 'B', marker: '', value: [30, 6.4], dataIndex: 0, axisValue: 30 },
            { seriesName: 'C', marker: '', value: [30, null], dataIndex: 0, axisValue: 30 },
            { seriesName: 'D', marker: '', value: [30, 3.9], dataIndex: 0, axisValue: 30 },
        ];

        expect(formatter(params)).toBe('Week 30<br/>B: 6.4<br/>D: 3.9<br/>A: 1.5');
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

describe('buildCubesUpdated', () => {
    const cube = (adds: number[], removes: number[], rate: (number | null)[]): CubeChurn => ({
        cubeId: 'c', adds, removes, rate, totalAdds: 0, totalRemoves: 0, meanRate: 0,
    });

    it('computes the share of existing cubes modified and the median changes among modified cubes', () => {
        const churn: ChurnResult = {
            community: { rate: [null, 0.1, 0] },
            cubes: [
                cube([0, 40, 0], [0, 40, 0], [null, 0.2, 0]),
                cube([0, 2, 0], [0, 1, 0], [null, 0.01, 0]),
                cube([0, 0, 0], [0, 0, 0], [null, 0, 0]),
                cube([0, 0, 0], [0, 0, 0], [null, null, 0]),
            ],
        };

        expect(buildCubesUpdated(churn, [100, 200, 300])).toEqual([
            { t: 100, active: 0, modified: 0, share: null, medianChanges: null },
            { t: 200, active: 3, modified: 2, share: 2 / 3, medianChanges: 41.5 },
            { t: 300, active: 4, modified: 0, share: 0, medianChanges: null },
        ]);
    });

    it('builds a share bar with a median-changes line on a second axis', () => {
        const option = buildCubesUpdatedOption(
            [{ t: 200, active: 3, modified: 2, share: 2 / 3, medianChanges: 41.5 }],
            [],
        ) as { series: { name: string; type: string; yAxisIndex?: number; data: [number, number | null][] }[]; yAxis: unknown[] };

        expect(option.yAxis).toHaveLength(2);
        expect(option.series.map((s) => [s.name, s.type, s.yAxisIndex ?? 0])).toEqual([
            ['Cubes modified', 'bar', 0],
            ['Median changes', 'line', 1],
        ]);
        expect(option.series[0].data).toEqual([[200, 2 / 3]]);
        expect(option.series[1].data).toEqual([[200, 41.5]]);
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
        ) as {
            tooltip: { valueFormatter: (v: number) => string };
            series: { name: string; stack: string; itemStyle: { color: string }; data: [number, number][] }[];
        };

        const [addsSeries, removesSeries] = option.series;

        expect(addsSeries.stack).toBe('changes');
        expect(removesSeries.stack).toBe('changes');
        expect(addsSeries.itemStyle.color).toBe('#67C23A');
        expect(removesSeries.itemStyle.color).toBe('#F56C6C');
        expect(removesSeries.data.every(([, value]) => value <= 0)).toBe(true);
    });

    it('shows removes as positive counts in the tooltip via valueFormatter', () => {
        const option = buildAddsRemovesOption([], []) as { tooltip: { valueFormatter: (v: number) => string } };
        expect(option.tooltip.valueFormatter(-7)).toBe('7');
        expect(option.tooltip.valueFormatter(5)).toBe('5');
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
