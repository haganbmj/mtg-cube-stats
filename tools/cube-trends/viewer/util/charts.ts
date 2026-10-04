import type { TimelinePoint } from '../../analysis/timeline';
import type { SetInfo } from '../../analysis/context';
import { releaseMarkLines } from './releaseMarkers';

const ADDS_COLOR = '#67C23A';
const REMOVES_COLOR = '#F56C6C';

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
