<template>
    <div class="overview-view">
        <el-row :gutter="16" class="headline-stats">
            <el-col :span="4"><el-statistic title="Cubes" :value="data.meta.cubes.length" /></el-col>
            <el-col :span="4"><el-statistic title="Samples" :value="data.meta.samples.length" /></el-col>
            <el-col :span="6"><el-statistic title="Distinct Cards (latest)" :value="distinctCardCount" /></el-col>
            <el-col :span="5">
                <div class="headline-stat">
                    <div class="headline-stat-title">Homogenization</div>
                    <div class="headline-stat-value">{{ homogenizationLabel }}</div>
                </div>
            </el-col>
            <el-col :span="5">
                <div class="headline-stat">
                    <div class="headline-stat-title"><InfoLabel label="Community Churn" :tip="churnTip" /></div>
                    <div class="headline-stat-value">{{ churnLabel }}</div>
                </div>
            </el-col>
        </el-row>

        <h3>Community Adds / Removes</h3>
        <p class="chart-description">Cards added (green, above zero) and removed (red, below zero) across all cubes in each sampling interval. Dashed vertical lines mark set releases.</p>
        <TrendChart :option="timelineChartOption" />

        <h3>Cubes Updated</h3>
        <p class="chart-description">Share of tracked cubes with at least one add or remove in each sampling interval (bars), so a single heavily edited cube counts once. The line is the median number of changes among cubes that changed.</p>
        <p class="chart-description">The tooltip reports "<em>m</em> of <em>n</em> tracked" because the denominator is not fixed at {{ data.meta.cubes.length }}. A cube only counts toward an interval when a snapshot of it could be resolved at the end of that interval, so cubes that did not exist yet (or had just been created on CubeCobra) and intervals whose snapshot could not be fetched are left out. Early intervals therefore have smaller denominators than recent ones.</p>
        <TrendChart :option="cubesUpdatedOption" />

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
                    <el-table-column prop="setCode" width="90" sortable :sort-method="(a, b) => byName(setCodeOf(a), setCodeOf(b))">
                        <template #header><InfoLabel label="Set" :tip="setTip" /></template>
                        <template #default="{ row }">
                            <template v-if="row.info.eligibility">
                                <SetSymbol :setCode="row.info.eligibility.setCode" :setName="setNames.get(row.info.eligibility.setCode)" />{{ row.info.eligibility.setCode.toUpperCase() }}
                            </template>
                            <template v-else>—</template>
                        </template>
                    </el-table-column>
                    <el-table-column prop="current" sortable :sort-method="(a, b) => compareNullable(a.current, b.current)">
                        <template #header><InfoLabel label="IR" :tip="irTip" /></template>
                        <template #default="{ row }">{{ formatPercent(row.current) }}</template>
                    </el-table-column>
                    <el-table-column prop="momentum" sortable :sort-method="(a, b) => compareNullable(a.momentum, b.momentum)">
                        <template #header><InfoLabel label="Momentum" :tip="momentumTip" /></template>
                        <template #default="{ row }"><SignedValue :value="row.momentum" :text="formatMomentum(row.momentum)" /></template>
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
                    <el-table-column prop="setCode" width="90" sortable :sort-method="(a, b) => byName(setCodeOf(a), setCodeOf(b))">
                        <template #header><InfoLabel label="Set" :tip="setTip" /></template>
                        <template #default="{ row }">
                            <template v-if="row.info.eligibility">
                                <SetSymbol :setCode="row.info.eligibility.setCode" :setName="setNames.get(row.info.eligibility.setCode)" />{{ row.info.eligibility.setCode.toUpperCase() }}
                            </template>
                            <template v-else>—</template>
                        </template>
                    </el-table-column>
                    <el-table-column prop="current" sortable :sort-method="(a, b) => compareNullable(a.current, b.current)">
                        <template #header><InfoLabel label="IR" :tip="irTip" /></template>
                        <template #default="{ row }">{{ formatPercent(row.current) }}</template>
                    </el-table-column>
                    <el-table-column prop="momentum" sortable :sort-method="(a, b) => compareNullable(a.momentum, b.momentum)">
                        <template #header><InfoLabel label="Momentum" :tip="momentumTip" /></template>
                        <template #default="{ row }"><SignedValue :value="row.momentum" :text="formatMomentum(row.momentum)" /></template>
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
            <el-table-column prop="setCode" width="90" sortable :sort-method="(a, b) => byName(setCodeOf(a.trend), setCodeOf(b.trend))">
                <template #header><InfoLabel label="Set" :tip="setTip" /></template>
                <template #default="{ row }">
                    <template v-if="row.trend.info.eligibility">
                        <SetSymbol :setCode="row.trend.info.eligibility.setCode" :setName="setNames.get(row.trend.info.eligibility.setCode)" />{{ row.trend.info.eligibility.setCode.toUpperCase() }}
                    </template>
                    <template v-else>—</template>
                </template>
            </el-table-column>
            <el-table-column prop="firstSeen" sortable :sort-method="(a, b) => compareNullable(a.trend.firstSeen, b.trend.firstSeen)">
                <template #header><InfoLabel label="First Seen" :tip="firstSeenTip" /></template>
                <template #default="{ row }">{{ formatDate(row.trend.firstSeen) }}</template>
            </el-table-column>
            <el-table-column prop="current" sortable :sort-method="(a, b) => compareNullable(a.trend.current, b.trend.current)">
                <template #header><InfoLabel label="IR" :tip="irTip" /></template>
                <template #default="{ row }">{{ formatPercent(row.trend.current) }}</template>
            </el-table-column>
            <el-table-column prop="momentum" sortable :sort-method="(a, b) => compareNullable(a.trend.momentum, b.trend.momentum)">
                <template #header><InfoLabel label="Momentum" :tip="momentumTip" /></template>
                <template #default="{ row }"><SignedValue :value="row.trend.momentum" :text="formatMomentum(row.trend.momentum)" /></template>
            </el-table-column>
        </el-table>

        <div class="overview-table-header">
            <h3>Cubes ({{ data.meta.cubes.length }})</h3>
            <ExportButton filename="cubes.csv" :rows="data.meta.cubes" :columns="cubeColumns" />
        </div>
        <p class="chart-description">Coverage counts how many of the {{ data.meta.samples.length }} sampled dates we could resolve a revision of the cube for; gaps count the sampled dates where CubeCobra never returned a usable revision. A cube that was created partway through the window has low coverage with zero gaps, while a cube with gaps has holes in an otherwise tracked history.</p>
        <el-table :data="data.meta.cubes" size="small" :default-sort="{ prop: 'name', order: 'ascending' }">
            <el-table-column prop="name" label="Cube" sortable :sort-method="(a, b) => byName(a.name, b.name)">
                <template #default="{ row }">
                    <el-link :href="cubeCobraUrl(row.id)" target="_blank" rel="noopener">{{ row.name }}</el-link>
                </template>
            </el-table-column>
            <el-table-column prop="owner" label="Owner" sortable :sort-method="(a, b) => byName(a.owner, b.owner)" />
            <el-table-column prop="coverage" width="140" sortable :sort-method="(a, b) => compareNullable(a.coverage, b.coverage)">
                <template #header><InfoLabel label="Coverage" :tip="coverageTip" /></template>
                <template #default="{ row }">
                    {{ row.coverage }}<span class="cell-secondary">/ {{ data.meta.samples.length }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="gaps" width="100" sortable :sort-method="(a, b) => compareNullable(a.gaps, b.gaps)">
                <template #header><InfoLabel label="Gaps" :tip="gapsTip" /></template>
                <template #default="{ row }">{{ row.gaps }}</template>
            </el-table-column>
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
import { buildAddsRemovesOption, buildCubesUpdated, buildCubesUpdatedOption } from '../util/charts';
import { formatPercent, formatMomentum, formatDate } from '../util/format';
import { compareNullable, byName } from '../util/sort';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import CardName from '../components/CardName.vue';
import InfoLabel from '../components/InfoLabel.vue';
import SignedValue from '../components/SignedValue.vue';
import SetSymbol from '../components/SetSymbol.vue';
import { buildSetNameLookup } from '../util/setNames';
import type { CsvColumn } from '../util/csv';

const irTip = 'Weighted share of cubes including the card at the latest snapshot.';
const momentumTip = 'Robust trend of IR, in percentage points per 30 days.';
const setTip = 'Set that first made the card eligible for this format.';
const firstSeenTip = 'First snapshot where any tracked cube included the card.';
const churnTip = 'Weighted share of a cube\'s slots replaced in the latest sampling interval ((adds + removes) ÷ 2 × cube size), averaged across cubes. 1% means the typical cube swapped about 1 in 100 of its cards that interval.';
const coverageTip = 'Sampled dates where a revision of this cube could be resolved, out of the total number of samples. Lower values mean the cube was created after the window began, or that snapshots are missing.';
const gapsTip = 'Sampled dates where CubeCobra never returned a usable revision for this cube. Those intervals are excluded from every statistic for this cube.';

const props = defineProps<{
    data: FullTrendsData;
}>();

const lastSampleIndex = computed(() => props.data.meta.samples.length - 1);

const distinctCardCount = computed(() => props.data.cards.cards.filter(
    (card) => card.count[lastSampleIndex.value] > 0,
).length);

const homogenizationLabel = computed(() => {
    const weightedMean = props.data.timeline.points[lastSampleIndex.value]?.homogenization?.weightedMean;
    return weightedMean === undefined || weightedMean === null ? '—' : formatPercent(weightedMean);
});

const churnLabel = computed(() => {
    const rate = props.data.churn.community.rate[lastSampleIndex.value];
    return rate === undefined || rate === null ? '—' : formatPercent(rate);
});

const cardsWithMomentum = computed(() => props.data.cards.cards.filter(
    (card) => card.momentum !== null,
));

const risers = computed(() => [...cardsWithMomentum.value]
    .sort((a, b) => b.momentum! - a.momentum!)
    .slice(0, 10));

const fallers = computed(() => [...cardsWithMomentum.value]
    .sort((a, b) => a.momentum! - b.momentum!)
    .slice(0, 10));

const cardLookup = computed(() => buildCardLookup(props.data.cards));
const setNames = computed(() => buildSetNameLookup(props.data.sets));

function setCodeOf(card: CardTrend): string {
    return card.info.eligibility?.setCode.toUpperCase() ?? '';
}

function cubeCobraUrl(cubeId: string): string {
    return `https://cubecobra.com/cube/about/${encodeURIComponent(cubeId)}`;
}

const newestConsensus = computed(() => props.data.consensus.cards
    .map((consensus) => ({ consensus, trend: cardLookup.value.get(consensus.oracleId) }))
    .filter((entry): entry is { consensus: ConsensusCard; trend: CardTrend } => (
        entry.trend !== undefined && entry.trend.firstSeen !== null
    ))
    .sort((a, b) => b.trend.firstSeen! - a.trend.firstSeen!)
    .slice(0, 10));

const momentumColumns: CsvColumn<CardTrend>[] = [
    { key: 'name', label: 'Card', value: (c) => c.info.name },
    { key: 'setCode', label: 'Set', value: (c) => setCodeOf(c) },
    { key: 'current', label: 'IR', value: (c) => c.current },
    { key: 'momentum', label: 'Momentum', value: (c) => c.momentum },
];

const newestConsensusColumns: CsvColumn<{ consensus: ConsensusCard; trend: CardTrend }>[] = [
    { key: 'name', label: 'Card', value: (r) => r.trend.info.name },
    { key: 'setCode', label: 'Set', value: (r) => setCodeOf(r.trend) },
    { key: 'firstSeen', label: 'First Seen', value: (r) => (r.trend.firstSeen === null ? '' : formatDate(r.trend.firstSeen)) },
    { key: 'current', label: 'IR', value: (r) => r.trend.current },
    { key: 'momentum', label: 'Momentum', value: (r) => r.trend.momentum },
];

const cubeColumns: CsvColumn<PanelCube & { coverage: number; gaps: number }>[] = [
    { key: 'name', label: 'Cube', value: (c) => c.name },
    { key: 'owner', label: 'Owner', value: (c) => c.owner },
    { key: 'coverage', label: 'Coverage', value: (c) => c.coverage },
    { key: 'samples', label: 'Samples', value: () => props.data.meta.samples.length },
    { key: 'gaps', label: 'Gaps', value: (c) => c.gaps },
    { key: 'url', label: 'CubeCobra', value: (c) => cubeCobraUrl(c.id) },
];

const timelineChartOption = computed(() => buildAddsRemovesOption(props.data.timeline.points, props.data.sets.markers));
const cubesUpdatedOption = computed(() => buildCubesUpdatedOption(
    buildCubesUpdated(props.data.churn, props.data.meta.samples),
    props.data.sets.markers,
));
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
