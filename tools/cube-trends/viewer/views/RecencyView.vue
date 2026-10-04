<template>
    <div class="recency-view">
        <h3>Median Card Age</h3>
        <p class="chart-description">Median time since cards first became eligible, across all cards in all cubes.</p>
        <TrendChart :option="ageOption" />

        <h3>Share Under Age Threshold</h3>
        <p class="chart-description">Share of cube slots filled by cards eligible within the last 3, 6, or 12 months.</p>
        <TrendChart :option="shareOption" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatPercent, formatPercentTooltip, formatYears, daysToYears } from '../util/format';
import TrendChart from '../components/TrendChart.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const ageOption = computed(() => ({
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatYears(v) },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: 'Years' },
    series: [{
        type: 'line',
        connectNulls: false,
        data: props.data.timeline.points.map((p) => [p.t, p.medianAgeDays === null ? null : daysToYears(p.medianAgeDays)]),
        markLine: releaseMarkLines(props.data.sets.markers),
    }],
}));

const shareOption = computed(() => ({
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatPercentTooltip(v) },
    legend: { data: ['< 3mo', '< 6mo', '< 12mo'] },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: [
        {
            name: '< 3mo',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.shareUnder.m3]),
            markLine: releaseMarkLines(props.data.sets.markers),
        },
        {
            name: '< 6mo',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.shareUnder.m6]),
        },
        {
            name: '< 12mo',
            type: 'line',
            connectNulls: false,
            data: props.data.timeline.points.map((p) => [p.t, p.shareUnder.m12]),
        },
    ],
}));
</script>
