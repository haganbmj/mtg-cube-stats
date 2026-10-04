import type { TimelinePoint } from '../../analysis/timeline';
import type { SetInfo } from '../../analysis/context';
import type { ChurnResult } from '../../analysis/churn';
import { releaseMarkLines } from './releaseMarkers';
import { formatDate, formatPercentTooltip } from './format';

const ADDS_COLOR = '#67C23A';
const REMOVES_COLOR = '#F56C6C';

export interface CubesUpdatedPoint {
    t: number;
    active: number;
    modified: number;
    share: number | null;
    medianChanges: number | null;
}

function median(values: number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// A cube counts as active in an interval when it has a churn rate there (existed at both ends).
export function buildCubesUpdated(churn: ChurnResult, samples: number[]): CubesUpdatedPoint[] {
    return samples.map((t, k) => {
        const changes = churn.cubes
            .filter((cube) => cube.rate[k] !== null)
            .map((cube) => cube.adds[k] + cube.removes[k]);
        const modified = changes.filter((c) => c > 0);
        return {
            t,
            active: changes.length,
            modified: modified.length,
            share: changes.length > 0 ? modified.length / changes.length : null,
            medianChanges: median(modified),
        };
    });
}

export function buildCubesUpdatedOption(points: CubesUpdatedPoint[], markers: SetInfo[]): object {
    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params: { dataIndex: number }[]) => {
                const p = points[params[0].dataIndex];
                const rows = [formatDate(p.t)];
                if (p.share !== null) {
                    rows.push(`Cubes modified: ${formatPercentTooltip(p.share)} (${p.modified} of ${p.active})`);
                }
                if (p.medianChanges !== null) {
                    rows.push(`Median changes: ${Math.round(p.medianChanges)}`);
                }
                return rows.join('<br/>');
            },
        },
        legend: { data: ['Cubes modified', 'Median changes'] },
        xAxis: { type: 'time' },
        yAxis: [
            { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v: number) => `${Math.round(v * 100)}%` } },
            { type: 'value', min: 0, name: 'Median changes', nameLocation: 'middle', nameGap: 36, splitLine: { show: false } },
        ],
        series: [
            {
                name: 'Cubes modified',
                type: 'bar',
                data: points.map((p) => [p.t, p.share]),
                markLine: releaseMarkLines(markers),
            },
            {
                name: 'Median changes',
                type: 'line',
                yAxisIndex: 1,
                smooth: false,
                connectNulls: false,
                data: points.map((p) => [p.t, p.medianChanges]),
            },
        ],
    };
}

// Single stacked bar per interval: adds above zero, removes below.
export function buildAddsRemovesOption(points: TimelinePoint[], markers: SetInfo[]): object {
    return {
        tooltip: { trigger: 'axis', valueFormatter: (v: number) => String(Math.abs(v)) },
        legend: { data: ['Adds', 'Removes'] },
        xAxis: { type: 'time' },
        yAxis: { type: 'value' },
        series: [
            {
                name: 'Adds',
                type: 'bar',
                stack: 'changes',
                itemStyle: { color: ADDS_COLOR },
                data: points.map((p) => [p.t, p.adds]),
                markLine: releaseMarkLines(markers),
            },
            {
                name: 'Removes',
                type: 'bar',
                stack: 'changes',
                itemStyle: { color: REMOVES_COLOR },
                data: points.map((p) => [p.t, -p.removes]),
            },
        ],
    };
}
