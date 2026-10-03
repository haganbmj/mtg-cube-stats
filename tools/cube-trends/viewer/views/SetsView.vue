<template>
    <div class="sets-view">
        <h3>Adoption Curves</h3>
        <TrendChart :option="adoptionOption" />

        <div class="sets-table-header">
            <h3>Peak / Retention</h3>
            <ExportButton filename="sets.csv" :rows="data.sets.adoption" :columns="peakColumns" />
        </div>
        <el-table :data="data.sets.adoption" size="small">
            <el-table-column prop="code" label="Set" />
            <el-table-column prop="name" label="Name" />
            <el-table-column label="Peak">
                <template #default="{ row }">{{ formatPercent(row.peak) }}</template>
            </el-table-column>
            <el-table-column prop="timeToPeakWeeks" label="Weeks to Peak" />
            <el-table-column label="Retention">
                <template #default="{ row }">{{ row.retention === null ? '—' : formatPercent(row.retention) }}</template>
            </el-table-column>
        </el-table>

        <h3>Displacement</h3>
        <el-collapse>
            <el-collapse-item v-for="marker in data.sets.markers" :key="marker.code" :name="marker.code" :title="`${marker.name} (${marker.code})`">
                <template v-if="displacementByCode.get(marker.code)">
                    <el-table :data="displacementByCode.get(marker.code)!.groups" size="small">
                        <el-table-column prop="colorCategory" label="Category" />
                        <el-table-column prop="primaryType" label="Type" />
                        <el-table-column prop="removals" label="Removals" />
                        <el-table-column label="Expected">
                            <template #default="{ row }">{{ row.expected.toFixed(1) }}</template>
                        </el-table-column>
                        <el-table-column label="Lift">
                            <template #default="{ row }">{{ row.lift.toFixed(2) }}</template>
                        </el-table-column>
                    </el-table>
                    <h5>Top Displaced Cards</h5>
                    <ul>
                        <li v-for="card in displacementByCode.get(marker.code)!.topCards" :key="card.key">
                            {{ cardLookup.get(card.key)?.info.name ?? card.key }} ({{ card.removals }})
                        </li>
                    </ul>
                </template>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { SetAdoption } from '../../analysis/sets';
import { buildCardLookup } from '../util/cardLookup';
import { formatPercent } from '../util/format';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import type { CsvColumn } from '../util/csv';

const props = defineProps<{
    data: FullTrendsData;
}>();

const cardLookup = computed(() => buildCardLookup(props.data.cards));

const displacementByCode = computed(() => new Map(props.data.sets.displacement.map((d) => [d.code, d])));

const adoptionOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', data: props.data.sets.adoption.map((s) => s.name) },
    xAxis: { type: 'value', name: 'Weeks since release' },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
    series: props.data.sets.adoption.map((set) => ({
        name: set.name,
        type: 'line',
        data: set.curve.map((p) => [p.week, p.value]),
    })),
}));

const peakColumns: CsvColumn<SetAdoption>[] = [
    { key: 'code', label: 'Set', value: (s) => s.code },
    { key: 'name', label: 'Name', value: (s) => s.name },
    { key: 'peak', label: 'Peak', value: (s) => s.peak },
    { key: 'timeToPeakWeeks', label: 'Weeks to Peak', value: (s) => s.timeToPeakWeeks },
    { key: 'retention', label: 'Retention', value: (s) => s.retention },
];
</script>

<style scoped>
.sets-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
</style>
