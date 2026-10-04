<template>
    <div class="churn-view">
        <h3>Community Churn Rate</h3>
        <p class="chart-description">Weighted share of a cube's slots changed per interval ((adds + removes) ÷ 2 × size).</p>
        <TrendChart :option="communityOption" />

        <div class="churn-table-header">
            <h3>Curators</h3>
            <ExportButton filename="churn.csv" :rows="rows" :columns="exportColumns" />
        </div>
        <el-table :data="rows" size="small" :default-sort="{ prop: 'changes', order: 'descending' }">
            <el-table-column prop="name" label="Cube" sortable :sort-method="(a, b) => byName(a.name, b.name)" />
            <el-table-column prop="owner" label="Owner" sortable :sort-method="(a, b) => byName(a.owner, b.owner)" />
            <el-table-column prop="totalAdds" label="Adds" sortable :sort-method="(a, b) => compareNullable(a.totalAdds, b.totalAdds)" />
            <el-table-column prop="totalRemoves" label="Removes" sortable :sort-method="(a, b) => compareNullable(a.totalRemoves, b.totalRemoves)" />
            <el-table-column prop="changes" label="Changes" sortable :sort-method="(a, b) => compareNullable(a.changes, b.changes)" />
            <el-table-column prop="meanRate" label="Mean Rate" sortable :sort-method="(a, b) => compareNullable(a.meanRate, b.meanRate)">
                <template #default="{ row }">{{ formatPercent(row.meanRate) }}</template>
            </el-table-column>
            <el-table-column label="Trend">
                <template #default="{ row }">
                    <Sparkline :values="row.sparkValues" />
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { CubeChurn } from '../../analysis/churn';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatPercent, formatPercentTooltip } from '../util/format';
import { compareNullable, byName } from '../util/sort';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import Sparkline from '../components/Sparkline.vue';
import type { CsvColumn } from '../util/csv';

const props = defineProps<{
    data: FullTrendsData;
}>();

interface ChurnRow extends CubeChurn {
    name: string;
    owner: string;
    changes: number;
    sparkValues: (number | null)[];
}

const cubeLookup = computed(() => new Map(props.data.meta.cubes.map((cube) => [cube.id, cube])));

const rows = computed<ChurnRow[]>(() => props.data.churn.cubes.map((cube) => ({
    ...cube,
    name: cubeLookup.value.get(cube.cubeId)?.name ?? cube.cubeId,
    owner: cubeLookup.value.get(cube.cubeId)?.owner ?? '',
    changes: cube.totalAdds + cube.totalRemoves,
    sparkValues: cube.rate,
})));

const communityOption = computed(() => ({
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatPercentTooltip(v) },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: [{
        type: 'line',
        connectNulls: false,
        data: props.data.meta.samples.map((t, k) => [t, props.data.churn.community.rate[k]]),
        markLine: releaseMarkLines(props.data.sets.markers),
    }],
}));

const exportColumns: CsvColumn<ChurnRow>[] = [
    { key: 'name', label: 'Cube', value: (r) => r.name },
    { key: 'owner', label: 'Owner', value: (r) => r.owner },
    { key: 'totalAdds', label: 'Adds', value: (r) => r.totalAdds },
    { key: 'totalRemoves', label: 'Removes', value: (r) => r.totalRemoves },
    { key: 'meanRate', label: 'Mean Rate', value: (r) => r.meanRate },
];
</script>

<style scoped>
.churn-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
