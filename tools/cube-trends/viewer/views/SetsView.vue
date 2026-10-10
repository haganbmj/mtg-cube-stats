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
            <el-table-column prop="code" label="Set" sortable :sort-method="(a, b) => byName(a.code, b.code)">
                <template #default="{ row }"><SetSymbol :setCode="row.code" :setName="row.name" />{{ row.code }}</template>
            </el-table-column>
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

        <div class="sets-table-header">
            <h3>Set Trends</h3>
            <div class="sets-trend-controls">
                <el-radio-group v-model="trendMetric" size="small">
                    <el-radio-button value="perCube">Cards per cube</el-radio-button>
                    <el-radio-button value="share">Share of cube</el-radio-button>
                </el-radio-group>
                <ExportButton filename="set-trends.csv" :rows="data.sets.trends" :columns="trendColumns" />
            </div>
        </div>
        <p class="chart-description">Every set with cards in these cubes, by first eligible printing. Each card counts once per cube regardless of copies.</p>
        <el-table :data="data.sets.trends" size="small" max-height="480" :default-sort="{ prop: 'current', order: 'descending' }">
            <el-table-column prop="code" label="Set" sortable :sort-method="(a, b) => byName(a.code, b.code)">
                <template #default="{ row }"><SetSymbol :setCode="row.code" :setName="row.name" />{{ row.code }}</template>
            </el-table-column>
            <el-table-column prop="name" label="Name" min-width="180" sortable :sort-method="(a, b) => byName(a.name, b.name)" />
            <el-table-column prop="releasedAt" label="Released" sortable :sort-method="(a, b) => compareNullable(a.releasedAt, b.releasedAt)">
                <template #default="{ row }">{{ formatDate(row.releasedAt) }}</template>
            </el-table-column>
            <el-table-column prop="current" sortable :sort-method="(a, b) => compareNullable(a[trendMetric].current, b[trendMetric].current)">
                <template #header><InfoLabel label="Current" :tip="trendCurrentTip" /></template>
                <template #default="{ row }">{{ formatTrendValue(row[trendMetric].current) }}</template>
            </el-table-column>
            <el-table-column prop="delta" sortable :sort-method="(a, b) => compareNullable(a[trendMetric].delta, b[trendMetric].delta)">
                <template #header><InfoLabel label="Δ90d" :tip="trendDeltaTip" /></template>
                <template #default="{ row }"><SignedValue :value="row[trendMetric].delta" :text="formatTrendDelta(row[trendMetric].delta)" /></template>
            </el-table-column>
            <el-table-column prop="momentum" sortable :sort-method="(a, b) => compareNullable(a[trendMetric].momentum, b[trendMetric].momentum)">
                <template #header><InfoLabel label="Momentum" :tip="trendMomentumTip" /></template>
                <template #default="{ row }"><SignedValue :value="row[trendMetric].momentum" :text="formatTrendMomentum(row[trendMetric].momentum)" /></template>
            </el-table-column>
            <el-table-column label="Trend">
                <template #default="{ row }"><Sparkline :values="row[trendMetric].values" /></template>
            </el-table-column>
        </el-table>

        <h3>Displacement</h3>
        <el-collapse>
            <el-collapse-item
                v-for="marker in data.sets.markers"
                :key="marker.code"
                :name="marker.code"
            >
                <template #title>
                    <SetSymbol :setCode="marker.code" :setName="marker.name" />{{ `${marker.name} (${marker.code}) — released ${formatDate(marker.releasedAt)}${displacementByCode.get(marker.code)?.partial ? ' (partial window)' : ''}` }}
                </template>
                <template v-if="displacementByCode.get(marker.code)">
                    <div class="export-row">
                        <ExportButton
                            :filename="`${marker.code}-displacement-groups.csv`"
                            :rows="displacementByCode.get(marker.code)!.groups"
                            :columns="displacementGroupsColumns"
                        />
                    </div>
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
                    <div class="displacement-columns">
                        <div class="displacement-column">
                            <div class="sets-table-header">
                                <h5>Top Removals</h5>
                                <ExportButton
                                    :filename="`${marker.code}-top-removals.csv`"
                                    :rows="displacementByCode.get(marker.code)!.topCards"
                                    :columns="topRemovalsColumns"
                                />
                            </div>
                            <el-table :data="displacementByCode.get(marker.code)!.topCards" size="small" :default-sort="{ prop: 'removals', order: 'descending' }">
                                <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(cardLookup.get(a.key)?.info.name ?? a.key, cardLookup.get(b.key)?.info.name ?? b.key)">
                                    <template #default="{ row }">
                                        <CardName
                                            :name="cardLookup.get(row.key)?.info.name ?? row.key"
                                            :imageUrl="cardLookup.get(row.key)?.info.urlFront"
                                            :setCode="cardLookup.get(row.key)?.info.eligibility?.setCode"
                                        />
                                    </template>
                                </el-table-column>
                                <el-table-column prop="removals" label="Removals" sortable :sort-method="(a, b) => compareNullable(a.removals, b.removals)" />
                            </el-table>
                        </div>
                        <div class="displacement-column">
                            <div class="sets-table-header">
                                <h5>Top Additions</h5>
                                <ExportButton
                                    :filename="`${marker.code}-top-additions.csv`"
                                    :rows="displacementByCode.get(marker.code)!.topAdded"
                                    :columns="topAdditionsColumns"
                                />
                            </div>
                            <el-table :data="displacementByCode.get(marker.code)!.topAdded" size="small" :default-sort="{ prop: 'additions', order: 'descending' }">
                                <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(cardLookup.get(a.key)?.info.name ?? a.key, cardLookup.get(b.key)?.info.name ?? b.key)">
                                    <template #default="{ row }">
                                        <CardName
                                            :name="cardLookup.get(row.key)?.info.name ?? row.key"
                                            :imageUrl="cardLookup.get(row.key)?.info.urlFront"
                                            :setCode="cardLookup.get(row.key)?.info.eligibility?.setCode"
                                        />
                                    </template>
                                </el-table-column>
                                <el-table-column prop="additions" label="Additions" sortable :sort-method="(a, b) => compareNullable(a.additions, b.additions)" />
                                <el-table-column prop="fromSet" sortable :sort-method="(a, b) => compareNullable(Number(a.fromSet), Number(b.fromSet))">
                                    <template #header><InfoLabel label="From Set" :tip="fromSetTip" /></template>
                                    <template #default="{ row }">{{ row.fromSet ? '✓' : '—' }}</template>
                                </el-table-column>
                            </el-table>
                        </div>
                    </div>
                </template>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { SetAdoption, DisplacementGroup, SetTrend } from '../../analysis/sets';
import { buildCardLookup } from '../util/cardLookup';
import { formatCount, formatSignedCount, formatMomentum, formatPercent, formatDate, axisTooltip } from '../util/format';
import { compareNullable, byName } from '../util/sort';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import CardName from '../components/CardName.vue';
import InfoLabel from '../components/InfoLabel.vue';
import Sparkline from '../components/Sparkline.vue';
import SignedValue from '../components/SignedValue.vue';
import SetSymbol from '../components/SetSymbol.vue';
import type { CsvColumn } from '../util/csv';

const retentionTip = 'Adoption at 26 weeks as a share of peak adoption.';
const displacementTip = "Removals in the 8 weeks after release vs. each cube's normal removal rate.";
const fromSetTip = "Card's first eligible printing is in this set.";
const trendCurrentTip = 'Weighted mean across cubes at the latest snapshot.';
const trendDeltaTip = 'Change over roughly the last 90 days.';
const trendMomentumTip = 'Robust trend per 30 days over the full window. Shown for sets reaching at least 0.5 cards per cube.';

const trendMetric = ref<'perCube' | 'share'>('perCube');

function formatTrendValue(value: number): string {
    return trendMetric.value === 'perCube' ? formatCount(value) : formatPercent(value);
}

function formatTrendDelta(value: number | null): string {
    if (trendMetric.value === 'perCube') {
        return formatSignedCount(value);
    }
    return value === null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} pp`;
}

function formatTrendMomentum(value: number | null): string {
    return trendMetric.value === 'perCube' ? formatSignedCount(value, ' /30d') : formatMomentum(value, 2);
}

const trendColumns: CsvColumn<SetTrend>[] = [
    { key: 'code', label: 'Set', value: (s) => s.code },
    { key: 'name', label: 'Name', value: (s) => s.name },
    { key: 'releasedAt', label: 'Released', value: (s) => formatDate(s.releasedAt) },
    { key: 'perCube', label: 'Cards per cube', value: (s) => s.perCube.current },
    { key: 'perCubeDelta', label: 'Cards per cube Δ90d', value: (s) => s.perCube.delta },
    { key: 'perCubeMomentum', label: 'Cards per cube momentum /30d', value: (s) => s.perCube.momentum },
    { key: 'share', label: 'Share of cube', value: (s) => s.share.current },
    { key: 'shareDelta', label: 'Share Δ90d', value: (s) => s.share.delta },
    { key: 'shareMomentum', label: 'Share momentum /30d', value: (s) => s.share.momentum },
];

const props = defineProps<{
    data: FullTrendsData;
}>();

const cardLookup = computed(() => buildCardLookup(props.data.cards));

const displacementByCode = computed(() => new Map(props.data.sets.displacement.map((d) => [d.code, d])));

const adoptionOption = computed(() => ({
    tooltip: { trigger: 'axis', formatter: axisTooltip((x) => `Week ${Math.round(x)}`, formatCount, { sortDesc: true }) },
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

const displacementGroupsColumns: CsvColumn<DisplacementGroup>[] = [
    { key: 'colorCategory', label: 'Category', value: (g) => g.colorCategory },
    { key: 'primaryType', label: 'Type', value: (g) => g.primaryType },
    { key: 'removals', label: 'Removals', value: (g) => g.removals },
    { key: 'expected', label: 'Expected', value: (g) => g.expected.toFixed(1) },
    { key: 'lift', label: 'Lift', value: (g) => g.lift.toFixed(2) },
];

const topRemovalsColumns: CsvColumn<{ key: string; removals: number }>[] = [
    { key: 'name', label: 'Card', value: (r) => cardLookup.value.get(r.key)?.info.name ?? r.key },
    { key: 'removals', label: 'Removals', value: (r) => r.removals },
];

const topAdditionsColumns: CsvColumn<{ key: string; additions: number; fromSet: boolean }>[] = [
    { key: 'name', label: 'Card', value: (r) => cardLookup.value.get(r.key)?.info.name ?? r.key },
    { key: 'additions', label: 'Additions', value: (r) => r.additions },
    { key: 'fromSet', label: 'From Set', value: (r) => (r.fromSet ? 'yes' : 'no') },
];
</script>

<style scoped>
.sets-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sets-trend-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.export-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
}

.displacement-columns {
    display: flex;
    gap: 24px;
}

.displacement-column {
    flex: 1;
    min-width: 0;
}

@media (max-width: 900px) {
    .displacement-columns {
        flex-direction: column;
    }
}
</style>
