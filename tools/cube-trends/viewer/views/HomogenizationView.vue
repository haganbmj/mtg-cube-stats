<template>
    <div class="homogenization-view">
        <h3>Mean Pairwise Similarity</h3>
        <TrendChart :option="option" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MetaResult } from '../../output';
import type { AnalysisData } from '../dataSource';
import { releaseMarkLines } from '../util/releaseMarkers';
import TrendChart from '../components/TrendChart.vue';

type FullData = Required<AnalysisData> & { meta: MetaResult };

const props = defineProps<{
    data: FullData;
}>();

const points = computed(() => props.data.timeline.points.filter((p) => p.homogenization !== null));

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
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0 },
            data: points.value.map((p) => [p.t, p.homogenization!.q1]),
        },
        {
            name: 'IQR',
            type: 'line',
            stack: 'band',
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0.2 },
            data: points.value.map((p) => [p.t, p.homogenization!.q3 - p.homogenization!.q1]),
        },
        {
            name: 'Weighted Mean',
            type: 'line',
            data: points.value.map((p) => [p.t, p.homogenization!.weightedMean]),
            markLine: releaseMarkLines(props.data.sets.markers),
        },
        {
            name: 'Mean',
            type: 'line',
            data: points.value.map((p) => [p.t, p.homogenization!.mean]),
        },
    ],
}));
</script>
