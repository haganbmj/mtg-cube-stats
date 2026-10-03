<template>
    <div class="shape-view">
        <h3>Color Category Shares</h3>
        <p class="chart-description">Median share of each color category across cubes at each snapshot.</p>
        <TrendChart :option="colorOption" />

        <h3>Cube Size</h3>
        <p class="chart-description">Median cube size with the interquartile range (25th–75th percentile) shaded.</p>
        <TrendChart :option="sizeOption" />

        <h3>Type Shares</h3>
        <p class="chart-description">Median share of each card type across cubes at each snapshot.</p>
        <TrendChart :option="typeOption" />

        <h3>Mana Value Distribution (latest)</h3>
        <p class="chart-description">Median number of non-land cards at each mana value in the latest snapshot; tooltip shows the interquartile range.</p>
        <TrendChart :option="mvOption" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import { COLOR_CATEGORIES, MV_BUCKETS } from '../../analysis/cardInfo';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatPercent } from '../util/format';
import TrendChart from '../components/TrendChart.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const colorOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: COLOR_CATEGORIES },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: COLOR_CATEGORIES.map((cat, i) => ({
        name: cat,
        type: 'line',
        stack: 'color',
        areaStyle: {},
        data: props.data.shape.points.map((p) => [p.t, p.color[cat].median]),
        markLine: i === 0 ? releaseMarkLines(props.data.sets.markers) : undefined,
    })),
}));

const sizeOption = computed(() => {
    const points = props.data.shape.points;
    return {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Median'] },
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: 'Cube size' },
        series: [
            {
                name: 'Q1',
                type: 'line',
                stack: 'band',
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { opacity: 0 },
                data: points.map((p) => [p.t, p.size.q1]),
            },
            {
                name: 'IQR',
                type: 'line',
                stack: 'band',
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { opacity: 0.2 },
                data: points.map((p) => [p.t, p.size.q3 - p.size.q1]),
            },
            {
                name: 'Median',
                type: 'line',
                data: points.map((p) => [p.t, p.size.median]),
                markLine: releaseMarkLines(props.data.sets.markers),
            },
        ],
    };
});

const typeOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', data: props.data.shape.types },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: props.data.shape.types.map((typeName, i) => ({
        name: typeName,
        type: 'line',
        stack: 'type',
        areaStyle: {},
        data: props.data.shape.points.map((p) => [p.t, p.type[typeName].median]),
        markLine: i === 0 ? releaseMarkLines(props.data.sets.markers) : undefined,
    })),
}));

const mvOption = computed(() => {
    const points = props.data.shape.points;
    const last = points[points.length - 1];
    return {
        tooltip: {
            formatter: (params: any) => `${params.name}<br/>Median: ${params.data.value}<br/>Q1: ${params.data.q1}<br/>Q3: ${params.data.q3}`,
        },
        xAxis: { type: 'category', data: MV_BUCKETS },
        yAxis: { type: 'value' },
        series: [{
            type: 'bar',
            data: MV_BUCKETS.map((bucket) => ({
                value: last.mvHistogram[bucket].median,
                q1: last.mvHistogram[bucket].q1,
                q3: last.mvHistogram[bucket].q3,
            })),
        }],
    };
});
</script>
