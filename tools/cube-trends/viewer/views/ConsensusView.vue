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
        <el-table :data="quotaRows" size="small">
            <el-table-column prop="category" label="Category" />
            <el-table-column prop="quota" label="Quota" />
            <el-table-column prop="actual" label="Actual" />
        </el-table>

        <h3>Cards by Category</h3>
        <div v-for="category in COLOR_CATEGORIES" :key="category" class="consensus-category">
            <h4>{{ category }}</h4>
            <ul class="consensus-card-list">
                <li v-for="card in cardsByCategory.get(category)" :key="card.oracleId" class="consensus-card">
                    <img :src="cardLookup.get(card.oracleId)?.info.urlFront" loading="lazy" width="32" :alt="cardName(card.oracleId)" />
                    <span class="consensus-card-name">
                        {{ cardName(card.oracleId) }}<template v-if="card.quantity >= 2"> &times;{{ card.quantity }}</template>
                    </span>
                    <span>{{ formatPercent(card.score) }}</span>
                    <span>{{ formatPercent(card.currentIr) }}</span>
                </li>
            </ul>
        </div>

        <h3>Type Mix: Consensus vs Community</h3>
        <TrendChart :option="typeOption" />

        <h3>Mana Value Curve: Consensus vs Community</h3>
        <TrendChart :option="mvOption" />

        <h3>Near Misses</h3>
        <el-collapse>
            <el-collapse-item v-for="category in COLOR_CATEGORIES" :key="category" :name="category" :title="category">
                <el-table :data="data.consensus.nearMisses[category]" size="small">
                    <el-table-column label="Name">
                        <template #default="{ row }">{{ cardName(row.oracleId) }}</template>
                    </el-table-column>
                    <el-table-column label="Score">
                        <template #default="{ row }">{{ formatPercent(row.score) }}</template>
                    </el-table-column>
                    <el-table-column label="Current IR">
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
import { formatPercent } from '../util/format';
import { downloadText, type CsvColumn } from '../util/csv';
import TrendChart from '../components/TrendChart.vue';
import ExportButton from '../components/ExportButton.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const cardLookup = computed(() => buildCardLookup(props.data.cards));

function cardName(oracleId: string): string {
    return cardLookup.value.get(oracleId)?.info.name ?? oracleId;
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
        tooltip: { trigger: 'axis' },
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

.consensus-card-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.consensus-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
}

.consensus-card-name {
    flex: 1;
}
</style>
