<template>
    <div class="homogenization-view">
        <h3>Mean Pairwise Similarity</h3>
        <p class="chart-description">Average pairwise similarity (cosine) between cubes at each snapshot; rising means cubes are converging. Shaded band is the interquartile range.</p>
        <TrendChart :option="option" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatPercent, formatPercentTooltip, bandTooltip } from '../util/format';
import TrendChart from '../components/TrendChart.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const option = computed(() => ({
    tooltip: {
        trigger: 'axis',
        formatter: bandTooltip({
            lines: [
                { seriesName: 'Weighted Mean', format: (v) => formatPercentTooltip(v) },
                { seriesName: 'Mean', format: (v) => formatPercentTooltip(v) },
            ],
            band: {
                q1: (index) => props.data.timeline.points[index].homogenization?.q1 ?? null,
                q3: (index) => props.data.timeline.points[index].homogenization?.q3 ?? null,
                format: (v) => formatPercentTooltip(v),
            },
        }),
    },
    legend: { data: ['Weighted Mean', 'Mean'] },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: [
        {
            name: 'Q1',
            type: 'line',
            stack: 'band',
            symbol: 'none',
            connectNulls: false,
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0 },
            data: props.data.timeline.points.map((p) => [p.t, p.homogenization?.q1 ?? null]),
        },
        {
            name: 'IQR',
            type: 'line',
            stack: 'band',
            symbol: 'none',
            connectNulls: false,
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0.2 },
            data: props.data.timeline.points.map((p) => [p.t, p.homogenization ? p.homogenization.q3 - p.homogenization.q1 : null]),
        },
        {
            name: 'Weighted Mean',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.homogenization?.weightedMean ?? null]),
            markLine: releaseMarkLines(props.data.sets.markers),
        },
        {
            name: 'Mean',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.homogenization?.mean ?? null]),
        },
    ],
}));
</script>
