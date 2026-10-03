<template>
    <div class="sets-view">
        <h3>Adoption Curves</h3>
        <p class="chart-description">Average number of a set's cards per cube by weeks since release (cards attributed to the set by first eligible printing).</p>
        <TrendChart :option="adoptionOption" />

        <div class="sets-table-header">
            <h3>Peak / Retention</h3>
            <ExportButton filename="sets.csv" :rows="data.sets.adoption" :columns="peakColumns" />
        </div>
        <el-table :data="data.sets.adoption" size="small" :default-sort="{ prop: 'releasedAt', order: 'descending' }">
            <el-table-column prop="code" label="Set" sortable :sort-method="(a, b) => byName(a.code, b.code)" />
            <el-table-column prop="name" label="Name" sortable :sort-method="(a, b) => byName(a.name, b.name)" />
            <el-table-column prop="releasedAt" label="Released" sortable :sort-method="(a, b) => compareNullable(a.releasedAt, b.releasedAt)">
                <template #default="{ row }">{{ formatDate(row.releasedAt) }}</template>
            </el-table-column>
            <el-table-column prop="peak" label="Peak (cards per cube)" sortable :sort-method="(a, b) => compareNullable(a.peak, b.peak)">
                <template #default="{ row }">{{ formatCount(row.peak) }}</template>
            </el-table-column>
            <el-table-column prop="timeToPeakWeeks" label="Weeks to Peak" sortable :sort-method="(a, b) => compareNullable(a.timeToPeakWeeks, b.timeToPeakWeeks)" />
            <el-table-column prop="retention" sortable :sort-method="(a, b) => compareNullable(a.retention, b.retention)">
                <template #header><InfoLabel label="Retention" :tip="retentionTip" /></template>
                <template #default="{ row }">{{ row.retention === null ? '—' : formatPercent(row.retention) }}</template>
            </el-table-column>
        </el-table>

        <h3>Displacement</h3>
        <el-collapse>
            <el-collapse-item
                v-for="marker in data.sets.markers"
                :key="marker.code"
                :name="marker.code"
                :title="`${marker.name} (${marker.code})${displacementByCode.get(marker.code)?.partial ? ' (partial window)' : ''}`"
            >
                <template v-if="displacementByCode.get(marker.code)">
                    <el-table :data="displacementByCode.get(marker.code)!.groups" size="small" :default-sort="{ prop: 'lift', order: 'descending' }">
                        <el-table-column prop="colorCategory" label="Category" sortable :sort-method="(a, b) => byName(a.colorCategory, b.colorCategory)" />
                        <el-table-column prop="primaryType" label="Type" sortable :sort-method="(a, b) => byName(a.primaryType, b.primaryType)" />
                        <el-table-column prop="removals" label="Removals" sortable :sort-method="(a, b) => compareNullable(a.removals, b.removals)" />
                        <el-table-column prop="expected" sortable :sort-method="(a, b) => compareNullable(a.expected, b.expected)">
                            <template #header><InfoLabel label="Expected" :tip="displacementTip" /></template>
                            <template #default="{ row }">{{ row.expected.toFixed(1) }}</template>
                        </el-table-column>
                        <el-table-column prop="lift" sortable :sort-method="(a, b) => compareNullable(a.lift, b.lift)">
                            <template #header><InfoLabel label="Lift" :tip="displacementTip" /></template>
                            <template #default="{ row }">{{ row.lift.toFixed(2) }}</template>
                        </el-table-column>
                    </el-table>
                    <h5>Top Displaced Cards</h5>
                    <el-table :data="displacementByCode.get(marker.code)!.topCards" size="small" :default-sort="{ prop: 'removals', order: 'descending' }">
                        <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(cardLookup.get(a.key)?.info.name ?? a.key, cardLookup.get(b.key)?.info.name ?? b.key)">
                            <template #default="{ row }">
                                <CardName
                                    :name="cardLookup.get(row.key)?.info.name ?? row.key"
                                    :imageUrl="cardLookup.get(row.key)?.info.urlFront"
                                    :setCode="cardLookup.get(row.key)?.info.eligibility?.setCode"
                                    :copies="copyNumber(row.key)"
                                />
                            </template>
                        </el-table-column>
                        <el-table-column prop="removals" label="Removals" sortable :sort-method="(a, b) => compareNullable(a.removals, b.removals)" />
                    </el-table>
                </template>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { SetAdoption } from '../../analysis/sets';
import { copyNumber } from '../../analysis/cardInfo';
import { buildCardLookup } from '../util/cardLookup';
import { formatCount, formatPercent, formatDate } from '../util/format';
import { compareNullable, byName } from '../util/sort';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import CardName from '../components/CardName.vue';
import InfoLabel from '../components/InfoLabel.vue';
import type { CsvColumn } from '../util/csv';

const retentionTip = 'Adoption at 26 weeks as a share of peak adoption.';
const displacementTip = "Removals in the 8 weeks after release vs. each cube's normal removal rate.";

const props = defineProps<{
    data: FullTrendsData;
}>();

const cardLookup = computed(() => buildCardLookup(props.data.cards));

const displacementByCode = computed(() => new Map(props.data.sets.displacement.map((d) => [d.code, d])));

const adoptionOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', data: props.data.sets.adoption.map((s) => s.name) },
    xAxis: { type: 'value', name: 'Weeks since release' },
    yAxis: { type: 'value', name: 'Cards per cube', axisLabel: { formatter: (v: number) => formatCount(v) } },
    series: props.data.sets.adoption.map((set) => ({
        name: set.name,
        type: 'line',
        data: set.curve.map((p) => [p.week, p.value]),
    })),
}));

const peakColumns: CsvColumn<SetAdoption>[] = [
    { key: 'code', label: 'Set', value: (s) => s.code },
    { key: 'name', label: 'Name', value: (s) => s.name },
    { key: 'peak', label: 'Peak (cards per cube)', value: (s) => formatCount(s.peak) },
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
