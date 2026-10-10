<template>
    <div class="cards-view">
        <div class="cards-toolbar">
            <el-input v-model="searchQuery" placeholder="Search cards..." clearable style="width: 240px;" />
            <el-select v-model="colorFilter" placeholder="Color" clearable style="width: 120px;">
                <el-option v-for="cat in COLOR_CATEGORIES" :key="cat" :label="cat" :value="cat" />
            </el-select>
            <ExportButton filename="cards.csv" :rows="sortedRows" :columns="exportColumns" />
        </div>

        <el-table :data="pagedRows" size="small" :default-sort="{ prop: 'current', order: 'descending' }" @sort-change="handleSortChange" @row-click="handleRowClick">
            <el-table-column prop="name" label="Name" sortable="custom">
                <template #default="{ row }">
                    <CardName
                        :name="row.info.name"
                        :imageUrl="row.info.urlFront"
                        :setCode="row.info.eligibility?.setCode"
                        clickable
                    />
                </template>
            </el-table-column>
            <el-table-column prop="current" sortable="custom">
                <template #header><InfoLabel label="IR" :tip="irTip" /></template>
                <template #default="{ row }">{{ formatPercent(row.current) }}</template>
            </el-table-column>
            <el-table-column prop="peak" sortable="custom">
                <template #header><InfoLabel label="Peak" :tip="peakTip" /></template>
                <template #default="{ row }">{{ formatPercent(row.peak) }}</template>
            </el-table-column>
            <el-table-column prop="delta" sortable="custom">
                <template #header><InfoLabel label="Δ90d" :tip="deltaTip" /></template>
                <template #default="{ row }">{{ row.delta === null ? '—' : formatPercent(row.delta) }}</template>
            </el-table-column>
            <el-table-column prop="momentum" sortable="custom">
                <template #header><InfoLabel label="Momentum" :tip="momentumTip" /></template>
                <template #default="{ row }">{{ formatMomentum(row.momentum) }}</template>
            </el-table-column>
            <el-table-column prop="eligibility" label="Eligibility" sortable="custom">
                <template #default="{ row }">
                    <template v-if="row.info.eligibility">{{ formatDate(row.info.eligibility.date) }} ({{ row.info.eligibility.setCode }})</template>
                    <template v-else>—</template>
                </template>
            </el-table-column>
            <el-table-column prop="colorCategory" label="Color" sortable="custom">
                <template #default="{ row }">{{ row.info.colorCategory }}</template>
            </el-table-column>
            <el-table-column label="Trend">
                <template #default="{ row }">
                    <Sparkline :values="row.ir" />
                </template>
            </el-table-column>
        </el-table>

        <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="sortedRows.length" layout="prev, pager, next" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FullTrendsData } from '../dataSource';
import type { CardTrend } from '../../analysis/cards';
import { COLOR_CATEGORIES, type ColorCategory } from '../../analysis/cardInfo';
import { formatPercent, formatMomentum, formatDate } from '../util/format';
import ExportButton from '../components/ExportButton.vue';
import Sparkline from '../components/Sparkline.vue';
import CardName from '../components/CardName.vue';
import InfoLabel from '../components/InfoLabel.vue';
import type { CsvColumn } from '../util/csv';

const irTip = 'Weighted share of cubes including the card at the latest snapshot.';
const peakTip = 'Highest inclusion rate reached over the full window.';
const deltaTip = 'Change in IR over roughly the last 90 days.';
const momentumTip = 'Robust trend of IR, in percentage points per 30 days.';

const props = defineProps<{
    data: FullTrendsData;
}>();

const emit = defineEmits<{
    (e: 'select-card', oracleId: string): void;
}>();

const searchQuery = ref('');
const colorFilter = ref<ColorCategory | ''>('');
const currentPage = ref(1);
const pageSize = 50;
const sortProp = ref('current');
const sortOrder = ref<'ascending' | 'descending' | null>('descending');

const filteredRows = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    return props.data.cards.cards.filter((card) => {
        if (query && !card.info.name.toLowerCase().includes(query)) {
            return false;
        }
        if (colorFilter.value && card.info.colorCategory !== colorFilter.value) {
            return false;
        }
        return true;
    });
});

function sortValue(card: CardTrend, prop: string): number | string | null {
    switch (prop) {
        case 'name':
            return card.info.name;
        case 'current':
            return card.current;
        case 'peak':
            return card.peak;
        case 'delta':
            return card.delta;
        case 'momentum':
            return card.momentum;
        case 'eligibility':
            return card.info.eligibility?.date ?? null;
        case 'colorCategory':
            return card.info.colorCategory;
        default:
            return null;
    }
}

const sortedRows = computed(() => {
    const rows = [...filteredRows.value];
    const order = sortOrder.value;
    if (!order) {
        return rows;
    }
    const dir = order === 'ascending' ? 1 : -1;
    rows.sort((a, b) => {
        const av = sortValue(a, sortProp.value);
        const bv = sortValue(b, sortProp.value);
        if (av === null && bv === null) {
            return 0;
        }
        if (av === null) {
            return 1;
        }
        if (bv === null) {
            return -1;
        }
        if (typeof av === 'string' || typeof bv === 'string') {
            return dir * String(av).localeCompare(String(bv));
        }
        return dir * (av - bv);
    });
    return rows;
});

const pagedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return sortedRows.value.slice(start, start + pageSize);
});

watch([searchQuery, colorFilter], () => {
    currentPage.value = 1;
});

function handleSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }): void {
    sortProp.value = prop;
    sortOrder.value = order;
}

function handleRowClick(row: CardTrend): void {
    emit('select-card', row.info.oracleId);
}

const exportColumns: CsvColumn<CardTrend>[] = [
    { key: 'name', label: 'Name', value: (c) => c.info.name },
    { key: 'current', label: 'Current IR', value: (c) => c.current },
    { key: 'peak', label: 'Peak IR', value: (c) => c.peak },
    { key: 'delta', label: 'Δ90d', value: (c) => c.delta },
    { key: 'momentum', label: 'Momentum', value: (c) => c.momentum },
    { key: 'eligibility', label: 'Eligibility', value: (c) => (c.info.eligibility ? formatDate(c.info.eligibility.date) : '') },
    { key: 'setCode', label: 'Set', value: (c) => c.info.eligibility?.setCode ?? '' },
    { key: 'colorCategory', label: 'Color', value: (c) => c.info.colorCategory },
];
</script>

<style scoped>
.cards-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}
</style>
