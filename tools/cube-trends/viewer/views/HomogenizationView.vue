<template>
    <div class="homogenization-view">
        <h3>Mean Pairwise Similarity</h3>
        <TrendChart :option="option" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import { releaseMarkLines } from '../util/releaseMarkers';
import TrendChart from '../components/TrendChart.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const option = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Weighted Mean', 'Mean'] },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', min: 0, max: 1 },
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
