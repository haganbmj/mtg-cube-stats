<template>
    <div class="consensus-view">
        <div class="consensus-summary-header">
            <h3>Summary</h3>
            <div class="consensus-exports">
                <ExportButton filename="consensus.csv" :rows="data.consensus.cards" :columns="exportColumns" />
                <el-button :icon="Download" size="small" @click="downloadImportList">Download .txt</el-button>
            </div>
        </div>
        <dl class="consensus-meta">
            <dt>Size</dt><dd>{{ data.consensus.size }}</dd>
        </dl>
        <el-table :data="quotaRows" size="small" :default-sort="{ prop: 'category', order: 'ascending' }">
            <el-table-column prop="category" label="Category" sortable :sort-method="(a, b) => compareCategory(a.category, b.category)" />
            <el-table-column prop="quota" label="Quota" sortable :sort-method="(a, b) => compareNullable(a.quota, b.quota)" />
            <el-table-column prop="actual" label="Actual" sortable :sort-method="(a, b) => compareNullable(a.actual, b.actual)" />
        </el-table>

        <h3>Cards by Category</h3>
        <div v-for="category in COLOR_CATEGORIES" :key="category" class="consensus-category">
            <h4>{{ category }}</h4>
            <el-table :data="cardsByCategory.get(category)" size="small" :default-sort="{ prop: 'score', order: 'descending' }">
                <el-table-column prop="name" label="Card" sortable :sort-method="(a, b) => byName(cardName(a.oracleId), cardName(b.oracleId))">
                    <template #default="{ row }">
                        <CardName
                            :name="cardName(row.oracleId)"
                            :imageUrl="cardLookup.get(row.oracleId)?.info.urlFront"
                            :setCode="cardLookup.get(row.oracleId)?.info.eligibility?.setCode"
                            :copies="row.quantity"
                        />
                    </template>
                </el-table-column>
                <el-table-column prop="quantity" label="Qty" sortable :sort-method="(a, b) => compareNullable(a.quantity, b.quantity)">
                    <template #default="{ row }">{{ row.quantity }}</template>
                </el-table-column>
                <el-table-column prop="score" sortable :sort-method="(a, b) => compareNullable(a.score, b.score)">
                    <template #header><InfoLabel label="Score" :tip="scoreTip" /></template>
                    <template #default="{ row }">{{ formatPercent(row.score) }}</template>
                </el-table-column>
                <el-table-column prop="currentIr" sortable :sort-method="(a, b) => compareNullable(a.currentIr, b.currentIr)">
                    <template #header><InfoLabel label="Current IR" :tip="currentIrTip" /></template>
                    <template #default="{ row }">{{ formatPercent(row.currentIr) }}</template>
                </el-table-column>
            </el-table>
        </div>

        <h3>Type Mix: Consensus vs Community</h3>
        <p class="chart-description">Consensus cube vs. the community median.</p>
        <TrendChart :option="typeOption" />

        <h3>Mana Value Curve: Consensus vs Community</h3>
        <p class="chart-description">Consensus cube vs. the community median.</p>
        <TrendChart :option="mvOption" />

        <h3>Near Misses</h3>
        <el-collapse>
            <el-collapse-item v-for="category in COLOR_CATEGORIES" :key="category" :name="category" :title="category">
                <el-table :data="data.consensus.nearMisses[category]" size="small" :default-sort="{ prop: 'score', order: 'descending' }">
                    <el-table-column prop="name" label="Name" sortable :sort-method="(a, b) => byName(cardName(a.oracleId), cardName(b.oracleId))">
                        <template #default="{ row }">
                            <CardName
                                :name="cardName(row.oracleId)"
                                :imageUrl="cardLookup.get(row.oracleId)?.info.urlFront"
                                :setCode="cardLookup.get(row.oracleId)?.info.eligibility?.setCode"
                                :copies="row.quantity"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column prop="quantity" label="Qty" sortable :sort-method="(a, b) => compareNullable(a.quantity, b.quantity)">
                        <template #default="{ row }">{{ row.quantity }}</template>
                    </el-table-column>
                    <el-table-column prop="score" sortable :sort-method="(a, b) => compareNullable(a.score, b.score)">
                        <template #header><InfoLabel label="Score" :tip="scoreTip" /></template>
                        <template #default="{ row }">{{ formatPercent(row.score) }}</template>
                    </el-table-column>
                    <el-table-column prop="currentIr" sortable :sort-method="(a, b) => compareNullable(a.currentIr, b.currentIr)">
                        <template #header><InfoLabel label="Current IR" :tip="currentIrTip" /></template>
                        <template #default="{ row }">{{ formatPercent(row.currentIr) }}</template>
                    </el-table-column>
                </el-table>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Download } from '@element-plus/icons-vue';
import type { FullTrendsData } from '../dataSource';
import type { ConsensusCard } from '../../analysis/consensus';
import { COLOR_CATEGORIES, MV_BUCKETS, type ColorCategory } from '../../analysis/cardInfo';
import { buildCardLookup } from '../util/cardLookup';
import { formatPercent, formatPercentTooltip } from '../util/format';
import { downloadText, type CsvColumn } from '../util/csv';
import { compareNullable, byName } from '../util/sort';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';
import CardName from '../components/CardName.vue';
import InfoLabel from '../components/InfoLabel.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const scoreTip = 'Mean inclusion rate over the last 90 days of snapshots. Cards are selected for the consensus cube in this order.';
const currentIrTip = 'Share of cubes (weighted) that include this card at the latest snapshot.';

const cardLookup = computed(() => buildCardLookup(props.data.cards));

function cardName(oracleId: string): string {
    return cardLookup.value.get(oracleId)?.info.name ?? oracleId;
}

function compareCategory(a: ColorCategory, b: ColorCategory): number {
    return COLOR_CATEGORIES.indexOf(a) - COLOR_CATEGORIES.indexOf(b);
}

const cardsByCategory = computed(() => {
    const map = new Map<ColorCategory, ConsensusCard[]>(COLOR_CATEGORIES.map((c) => [c, []]));
    for (const card of props.data.consensus.cards) {
        map.get(card.category)!.push(card);
    }
    return map;
});

const quotaRows = computed(() => COLOR_CATEGORIES.map((category) => ({
    category,
    quota: props.data.consensus.quotas[category],
    actual: (cardsByCategory.value.get(category) ?? []).reduce((sum, c) => sum + c.quantity, 0),
})));

const typeOption = computed(() => {
    const types = props.data.shape.types;
    return {
        tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatPercentTooltip(v) },
        legend: { data: ['Consensus', 'Community'] },
        xAxis: { type: 'category', data: types, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
        series: [
            { name: 'Consensus', type: 'bar', data: types.map((t) => props.data.consensus.shape.type[t]?.consensus ?? 0) },
            { name: 'Community', type: 'bar', data: types.map((t) => props.data.consensus.shape.type[t]?.community ?? 0) },
        ],
    };
});

const mvOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Consensus', 'Community'] },
    xAxis: { type: 'category', data: MV_BUCKETS },
    yAxis: { type: 'value' },
    series: [
        { name: 'Consensus', type: 'bar', data: MV_BUCKETS.map((b) => props.data.consensus.shape.mv[b]?.consensus ?? 0) },
        { name: 'Community', type: 'bar', data: MV_BUCKETS.map((b) => props.data.consensus.shape.mv[b]?.community ?? 0) },
    ],
}));

const exportColumns: CsvColumn<ConsensusCard>[] = [
    { key: 'category', label: 'Category', value: (c) => c.category },
    { key: 'name', label: 'Name', value: (c) => cardName(c.oracleId) },
    { key: 'quantity', label: 'Quantity', value: (c) => c.quantity },
    { key: 'score', label: 'Score', value: (c) => c.score },
    { key: 'currentIr', label: 'Current IR', value: (c) => c.currentIr },
    { key: 'elo', label: 'Elo', value: (c) => c.elo },
];

function downloadImportList(): void {
    const lines: string[] = [];
    for (const category of COLOR_CATEGORIES) {
        for (const card of cardsByCategory.value.get(category) ?? []) {
            const name = cardName(card.oracleId);
            for (let i = 0; i < card.quantity; i++) {
                lines.push(name);
            }
        }
    }
    downloadText('consensus.txt', lines.join('\n'), 'text/plain');
}
</script>

<style scoped>
.consensus-summary-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.consensus-exports {
    display: flex;
    gap: 8px;
}

.consensus-meta dt {
    font-weight: bold;
}

</style>
