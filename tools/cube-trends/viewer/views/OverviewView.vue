<template>
    <div class="overview-view">
        <el-row :gutter="16" class="headline-stats">
            <el-col :span="4"><el-statistic title="Cubes" :value="data.meta.cubes.length" /></el-col>
            <el-col :span="4"><el-statistic title="Samples" :value="data.meta.samples.length" /></el-col>
            <el-col :span="6"><el-statistic title="First-copy Cards (latest)" :value="distinctFirstCopyCount" /></el-col>
            <el-col :span="5">
                <div class="headline-stat">
                    <div class="headline-stat-title">Homogenization</div>
                    <div class="headline-stat-value">{{ homogenizationLabel }}</div>
                </div>
            </el-col>
            <el-col :span="5">
                <div class="headline-stat">
                    <div class="headline-stat-title">Community Churn</div>
                    <div class="headline-stat-value">{{ churnLabel }}</div>
                </div>
            </el-col>
        </el-row>

        <h3>Community Adds / Removes</h3>
        <TrendChart :option="timelineChartOption" />

        <el-row :gutter="16">
            <el-col :span="12">
                <div class="overview-table-header">
                    <h3>Top Risers</h3>
                    <ExportButton filename="top-risers.csv" :rows="risers" :columns="momentumColumns" />
                </div>
                <el-table :data="risers" size="small" :default-sort="{ prop: 'momentum', order: 'descending' }">
                    <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(a.info.name, b.info.name)">
                        <template #default="{ row }">
                            <CardName :name="row.info.name" :imageUrl="row.info.urlFront" :setCode="row.info.eligibility?.setCode" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="current" label="IR" sortable :sort-method="(a, b) => compareNullable(a.current, b.current)">
                        <template #default="{ row }">{{ formatPercent(row.current) }}</template>
                    </el-table-column>
                    <el-table-column prop="momentum" label="Momentum" sortable :sort-method="(a, b) => compareNullable(a.momentum, b.momentum)">
                        <template #default="{ row }">{{ formatMomentum(row.momentum) }}</template>
                    </el-table-column>
                </el-table>
            </el-col>
            <el-col :span="12">
                <div class="overview-table-header">
                    <h3>Top Fallers</h3>
                    <ExportButton filename="top-fallers.csv" :rows="fallers" :columns="momentumColumns" />
                </div>
                <el-table :data="fallers" size="small" :default-sort="{ prop: 'momentum', order: 'ascending' }">
                    <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(a.info.name, b.info.name)">
                        <template #default="{ row }">
                            <CardName :name="row.info.name" :imageUrl="row.info.urlFront" :setCode="row.info.eligibility?.setCode" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="current" label="IR" sortable :sort-method="(a, b) => compareNullable(a.current, b.current)">
                        <template #default="{ row }">{{ formatPercent(row.current) }}</template>
                    </el-table-column>
                    <el-table-column prop="momentum" label="Momentum" sortable :sort-method="(a, b) => compareNullable(a.momentum, b.momentum)">
                        <template #default="{ row }">{{ formatMomentum(row.momentum) }}</template>
                    </el-table-column>
                </el-table>
            </el-col>
        </el-row>

        <div class="overview-table-header">
            <h3>Newest Consensus Entries</h3>
            <ExportButton filename="newest-consensus.csv" :rows="newestConsensus" :columns="newestConsensusColumns" />
        </div>
        <el-table :data="newestConsensus" size="small" :default-sort="{ prop: 'firstSeen', order: 'descending' }">
            <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(a.trend.info.name, b.trend.info.name)">
                <template #default="{ row }">
                    <CardName :name="row.trend.info.name" :imageUrl="row.trend.info.urlFront" :setCode="row.trend.info.eligibility?.setCode" />
                </template>
            </el-table-column>
            <el-table-column prop="category" label="Category" sortable :sort-method="(a, b) => byName(a.consensus.category, b.consensus.category)">
                <template #default="{ row }">{{ row.consensus.category }}</template>
            </el-table-column>
            <el-table-column prop="firstSeen" label="First Seen" sortable :sort-method="(a, b) => compareNullable(a.trend.firstSeen, b.trend.firstSeen)">
                <template #default="{ row }">{{ formatDate(row.trend.firstSeen) }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="Qty" sortable :sort-method="(a, b) => compareNullable(a.consensus.quantity, b.consensus.quantity)">
                <template #default="{ row }">{{ row.consensus.quantity }}</template>
            </el-table-column>
        </el-table>

        <div class="overview-table-header">
            <h3>Cubes ({{ data.meta.cubes.length }})</h3>
            <ExportButton filename="cubes.csv" :rows="data.meta.cubes" :columns="cubeColumns" />
        </div>
        <el-table :data="data.meta.cubes" size="small" :default-sort="{ prop: 'name', order: 'ascending' }">
            <el-table-column prop="name" label="Cube" sortable :sort-method="(a, b) => byName(a.name, b.name)" />
            <el-table-column prop="owner" label="Owner" sortable :sort-method="(a, b) => byName(a.owner, b.owner)" />
            <el-table-column prop="coverage" label="Coverage" sortable :sort-method="(a, b) => compareNullable(a.coverage, b.coverage)" />
            <el-table-column prop="gaps" label="Gaps" sortable :sort-method="(a, b) => compareNullable(a.gaps, b.gaps)" />
        </el-table>

        <template v-if="data.meta.missing.length > 0">
            <h3>Missing ({{ data.meta.missing.length }})</h3>
            <ul>
                <li v-for="id in data.meta.missing" :key="id">{{ id }}</li>
            </ul>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { CardTrend } from '../../analysis/cards';
import type { ConsensusCard } from '../../analysis/consensus';
import type { PanelCube } from '../../analysis/panel';
import { buildCardLookup } from '../util/cardLookup';
import { releaseMarkLines } from '../util/releaseMarkers';
import { formatPercent, formatMomentum, formatDate } from '../util/format';
import { compareNullable, byName } from '../util/sort';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import CardName from '../components/CardName.vue';
import type { CsvColumn } from '../util/csv';

const props = defineProps<{
    data: FullTrendsData;
}>();

const lastSampleIndex = computed(() => props.data.meta.samples.length - 1);

const distinctFirstCopyCount = computed(() => props.data.cards.cards.filter(
    (card) => card.copy === 1 && card.count[lastSampleIndex.value] > 0,
).length);

const homogenizationLabel = computed(() => {
    const weightedMean = props.data.timeline.points[lastSampleIndex.value]?.homogenization?.weightedMean;
    return weightedMean === undefined || weightedMean === null ? '—' : formatPercent(weightedMean);
});

const churnLabel = computed(() => {
    const rate = props.data.churn.community.rate[lastSampleIndex.value];
    return rate === undefined || rate === null ? '—' : formatPercent(rate);
});

const copy1WithMomentum = computed(() => props.data.cards.cards.filter(
    (card) => card.copy === 1 && card.momentum !== null,
));

const risers = computed(() => [...copy1WithMomentum.value]
    .sort((a, b) => b.momentum! - a.momentum!)
    .slice(0, 10));

const fallers = computed(() => [...copy1WithMomentum.value]
    .sort((a, b) => a.momentum! - b.momentum!)
    .slice(0, 10));

const cardLookup = computed(() => buildCardLookup(props.data.cards));

const newestConsensus = computed(() => props.data.consensus.cards
    .map((consensus) => ({ consensus, trend: cardLookup.value.get(consensus.oracleId) }))
    .filter((entry): entry is { consensus: ConsensusCard; trend: CardTrend } => (
        entry.trend !== undefined && entry.trend.firstSeen !== null
    ))
    .sort((a, b) => b.trend.firstSeen! - a.trend.firstSeen!)
    .slice(0, 10));

const momentumColumns: CsvColumn<CardTrend>[] = [
    { key: 'name', label: 'Card', value: (c) => c.info.name },
    { key: 'current', label: 'IR', value: (c) => c.current },
    { key: 'momentum', label: 'Momentum', value: (c) => c.momentum },
];

const newestConsensusColumns: CsvColumn<{ consensus: ConsensusCard; trend: CardTrend }>[] = [
    { key: 'name', label: 'Card', value: (r) => r.trend.info.name },
    { key: 'category', label: 'Category', value: (r) => r.consensus.category },
    { key: 'firstSeen', label: 'First Seen', value: (r) => (r.trend.firstSeen === null ? '' : formatDate(r.trend.firstSeen)) },
    { key: 'quantity', label: 'Qty', value: (r) => r.consensus.quantity },
];

const cubeColumns: CsvColumn<PanelCube & { coverage: number; gaps: number }>[] = [
    { key: 'name', label: 'Cube', value: (c) => c.name },
    { key: 'owner', label: 'Owner', value: (c) => c.owner },
    { key: 'coverage', label: 'Coverage', value: (c) => c.coverage },
    { key: 'gaps', label: 'Gaps', value: (c) => c.gaps },
];

const timelineChartOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Adds', 'Removes'] },
    xAxis: { type: 'time' },
    yAxis: { type: 'value' },
    series: [
        {
            name: 'Adds',
            type: 'bar',
            data: props.data.timeline.points.map((p) => [p.t, p.adds]),
            markLine: releaseMarkLines(props.data.sets.markers),
        },
        {
            name: 'Removes',
            type: 'bar',
            data: props.data.timeline.points.map((p) => [p.t, -p.removes]),
        },
    ],
}));
</script>

<style scoped>
.overview-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.headline-stat-title {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
}

.headline-stat-value {
    font-size: 24px;
}
</style>
