<template>
    <div class="card-detail-view">
        <div v-if="info" class="card-detail-header">
            <img :src="info.urlFront" :alt="info.name" class="card-detail-image" />
            <h3>{{ info.name }}</h3>
        </div>

        <h4>Inclusion Rate</h4>
        <p class="chart-description">Weighted share of cubes running each copy of this card at each snapshot.</p>
        <TrendChart :option="irChartOption" />

        <h4>Cubes Including This Card</h4>
        <p class="chart-description">Number of cubes running each copy at each snapshot (unweighted, unlike IR).</p>
        <TrendChart :option="countChartOption" />

        <div class="card-timeline-header">
            <h4>Cube Timeline</h4>
            <ExportButton filename="card-timeline.csv" :rows="timelineRows" :columns="timelineColumns" />
        </div>
        <p class="chart-description">Cubes that ran this card during the window. Dates are snapshot dates (interval precision).</p>
        <el-table :data="timelineRows" size="small" :default-sort="{ prop: 'firstSeen', order: 'ascending' }">
            <el-table-column prop="name" label="Cube" sortable :sort-method="(a, b) => byName(a.name, b.name)" />
            <el-table-column prop="owner" label="Owner" sortable :sort-method="(a, b) => byName(a.owner, b.owner)" />
            <el-table-column prop="copiesLatest" label="Copies (latest)" sortable :sort-method="(a, b) => compareNullable(a.copiesLatest, b.copiesLatest)" />
            <el-table-column prop="firstSeen" label="First Seen" sortable :sort-method="(a, b) => compareNullable(a.firstSeen, b.firstSeen)">
                <template #default="{ row }">{{ formatDate(row.firstSeen) }}</template>
            </el-table-column>
            <el-table-column prop="lastSeen" label="Last Seen" sortable :sort-method="(a, b) => compareNullable(a.lastSeen, b.lastSeen)">
                <template #default="{ row }">{{ formatDate(row.lastSeen) }}</template>
            </el-table-column>
            <el-table-column label="Status" sortable :sort-method="(a, b) => byName(statusText(a), statusText(b))">
                <template #default="{ row }">{{ statusText(row) }}</template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatPercent, formatPercentTooltip, formatDate } from '../util/format';
import { compareNullable, byName } from '../util/sort';
import { buildCardTimeline, type CardTimelineRow } from '../util/cardTimeline';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import type { CsvColumn } from '../util/csv';

const props = defineProps<{
    data: FullTrendsData;
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
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatPercentTooltip(v) },
    legend: { data: copies.value.map((c) => copyLabel(c.copy)) },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: copies.value.map((c, i) => ({
        name: copyLabel(c.copy),
        type: 'line',
        data: props.data.meta.samples.map((t, k) => [t, c.ir[k]]),
        markLine: i === 0 ? releaseMarkLines(props.data.sets.markers) : undefined,
    })),
}));

const countChartOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: copies.value.map((c) => copyLabel(c.copy)) },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', min: 0 },
    series: copies.value.map((c, i) => ({
        name: copyLabel(c.copy),
        type: 'line',
        data: props.data.meta.samples.map((t, k) => [t, c.cubesPresent[k].length]),
        markLine: i === 0 ? releaseMarkLines(props.data.sets.markers) : undefined,
    })),
}));

const timelineRows = computed<CardTimelineRow[]>(() => (
    buildCardTimeline(copies.value, props.data.meta.samples, props.data.meta.cubes)
));

function statusText(row: CardTimelineRow): string {
    const base = row.current ? 'Current' : 'Removed';
    return row.addedInWindow ? `${base} · Added in window` : base;
}

const timelineColumns: CsvColumn<CardTimelineRow>[] = [
    { key: 'name', label: 'Cube', value: (r) => r.name },
    { key: 'owner', label: 'Owner', value: (r) => r.owner },
    { key: 'copiesLatest', label: 'Copies (latest)', value: (r) => r.copiesLatest },
    { key: 'firstSeen', label: 'First Seen', value: (r) => formatDate(r.firstSeen) },
    { key: 'lastSeen', label: 'Last Seen', value: (r) => formatDate(r.lastSeen) },
    { key: 'status', label: 'Status', value: (r) => statusText(r) },
];
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

.card-timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
