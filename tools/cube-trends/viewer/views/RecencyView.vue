<template>
    <div class="recency-view">
        <h3>Card Age Percentiles</h3>
        <p class="chart-description">Time since cards first became eligible, across all cards in all cubes. The 90th percentile line means 90% of cards are younger than that age.</p>
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
import { formatPercent, formatPercentTooltip, formatYears, daysToYears, formatDate, axisTooltip } from '../util/format';
import TrendChart from '../components/TrendChart.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const AGE_LINES = [
    { name: '90th', key: 'p90' },
    { name: '75th', key: 'p75' },
    { name: 'Median', key: 'p50' },
    { name: '25th', key: 'p25' },
    { name: '10th', key: 'p10' },
] as const;

const ageOption = computed(() => ({
    tooltip: { trigger: 'axis', formatter: axisTooltip(formatDate, formatYears, { sortDesc: true }) },
    legend: { data: AGE_LINES.map((line) => line.name) },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: 'Years' },
    series: AGE_LINES.map((line, i) => ({
        name: line.name,
        type: 'line',
        connectNulls: false,
        data: props.data.timeline.points.map((p) => [p.t, p.agePercentiles === null ? null : daysToYears(p.agePercentiles[line.key])]),
        markLine: i === 0 ? releaseMarkLines(props.data.sets.markers) : undefined,
    })),
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
