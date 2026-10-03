<template>
    <div class="recency-view">
        <h3>Median Card Age</h3>
        <TrendChart :option="ageOption" />

        <h3>Share Under Age Threshold</h3>
        <TrendChart :option="shareOption" />
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

const ageOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: 'Median age (days)' },
    series: [{
        type: 'line',
        connectNulls: false,
        data: props.data.timeline.points.map((p) => [p.t, p.medianAgeDays]),
        markLine: releaseMarkLines(props.data.sets.markers),
    }],
}));

const shareOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['< 3mo', '< 6mo', '< 12mo'] },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
        {
            name: '< 3mo',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.shareUnder.m3 * 100]),
            markLine: releaseMarkLines(props.data.sets.markers),
        },
        {
            name: '< 6mo',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.shareUnder.m6 * 100]),
        },
        {
            name: '< 12mo',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.shareUnder.m12 * 100]),
        },
    ],
}));
</script>
