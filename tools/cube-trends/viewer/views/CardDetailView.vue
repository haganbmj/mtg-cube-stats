<template>
    <div class="card-detail-view">
        <div v-if="info" class="card-detail-header">
            <img :src="info.urlFront" :alt="info.name" class="card-detail-image" />
            <h3>{{ info.name }}</h3>
        </div>

        <h4>Inclusion Rate</h4>
        <TrendChart :option="irChartOption" />

        <h4>Cube &times; Sample Copy Presence</h4>
        <TrendChart :option="heatmapOption" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MetaResult } from '../../output';
import type { AnalysisData } from '../dataSource';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatDate } from '../util/format';
import TrendChart from '../components/TrendChart.vue';

type FullData = Required<AnalysisData> & { meta: MetaResult };

const props = defineProps<{
    data: FullData;
    oracleId: string;
}>();

const copies = computed(() => [...props.data.cards.cards]
    .filter((card) => card.info.oracleId === props.oracleId)
    .sort((a, b) => a.copy - b.copy));

const info = computed(() => copies.value[0]?.info ?? null);

function copyLabel(copy: number): string {
    return copy === 1 ? 'Copy 1' : `×${copy}`;
}

const irChartOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: copies.value.map((c) => copyLabel(c.copy)) },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', min: 0, max: 1 },
    series: copies.value.map((c, i) => ({
        name: copyLabel(c.copy),
        type: 'line',
        data: props.data.meta.samples.map((t, k) => [t, c.ir[k]]),
        markLine: i === 0 ? releaseMarkLines(props.data.sets.markers) : undefined,
    })),
}));

const cubeNames = computed(() => props.data.meta.cubes.map((c) => c.name));

const heatmapData = computed(() => {
    const result: [number, number, number][] = [];
    const samples = props.data.meta.samples;
    for (let k = 0; k < samples.length; k++) {
        for (let c = 0; c < cubeNames.value.length; c++) {
            let count = 0;
            for (const copy of copies.value) {
                if (copy.cubesPresent[k]?.includes(c)) {
                    count++;
                }
            }
            result.push([k, c, count]);
        }
    }
    return result;
});

const heatmapMax = computed(() => heatmapData.value.reduce((max, [, , v]) => Math.max(max, v), 0));

const heatmapOption = computed(() => ({
    tooltip: { position: 'top' },
    grid: { left: 140, bottom: 60 },
    xAxis: { type: 'category', data: props.data.meta.samples.map((t) => formatDate(t)), axisLabel: { rotate: 45 } },
    yAxis: { type: 'category', data: cubeNames.value },
    visualMap: { min: 0, max: heatmapMax.value || 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 0 },
    series: [{ type: 'heatmap', data: heatmapData.value }],
}));
</script>

<style scoped>
.card-detail-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}

.card-detail-image {
    width: 150px;
    border-radius: 6px;
}
</style>
