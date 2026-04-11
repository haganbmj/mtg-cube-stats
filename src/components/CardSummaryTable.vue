<template>
    <div class="card-table-toolbar">
        <CardSearchInput
            class="card-table-search"
            v-model="activeQuery"
            :loadedCubes="loadedCubes"
            v-model:cubeFilter="activeCubeFilter"
        />
        <el-button-group>
            <el-button :icon="Grid" :type="visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = true" title="Visual Display" />
            <el-button :icon="List" :type="!visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = false" title="Table Display" />
        </el-button-group>
        <el-dropdown trigger="click">
            <el-button :icon="Menu" circle />
            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item @click="columnCustomizationVisible = true">Customize Columns</el-dropdown-item>
                    <el-dropdown-item @click="exportToCsv">Export as CSV</el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>

    <div class="card-table-pagination-row">
        <el-text tag="i">Filtered to {{ filteredRows.length }} / {{ sortedRows.length }} Cards</el-text>
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[25, 50, 100, 250]"
            :pager-count="5"
            :layout="paginationLayout"
            :total="filteredRows.length"
        />
    </div>

    <el-row v-if="visualDisplayVisible" class="visual-sort-bar" align="middle">
        <el-space wrap>
            <span class="sort-label">Sort by</span>
            <el-select v-model="visualSortProp" size="small" style="width: 160px;">
                <el-option
                    v-for="opt in visualSortOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                />
            </el-select>
            <el-button size="small" @click="toggleVisualSortOrder">
                {{ visualSortOrder === 'ascending' ? '↑ Ascending' : '↓ Descending' }}
            </el-button>
        </el-space>
    </el-row>

    <div v-if="visualDisplayVisible" class="visual-card-grid">
        <div
            v-for="card in visibleRows"
            :key="card.oracleId"
            class="visual-card-item"
            :class="{
                'card-item--highlighted': highlightedOracleIds && highlightedOracleIds.has(card.oracleId),
                'card-item--dimmed': highlightedOracleIds && !highlightedOracleIds.has(card.oracleId),
            }"
            @click="openCardDetailDialog(card.oracleId)"
        >
            <el-image
                :src="card.urlFront"
                fit="contain"
                :alt="card.name"
                :class="'card-image ' + card.setCode?.toLowerCase()"
                style="width: 100%;"
            />
            <div class="visual-card-label">
                <el-text size="small" truncated>{{ card.name }}</el-text>
                <el-tag type="info" size="small" style="margin-left: 6px;">{{ card.cubeCount }}</el-tag>
            </div>
        </div>
    </div>

    <StickyTable
        v-else
        :data="visibleRows"
        :columns="tableColumns"
        :default-sort="{ prop: 'cubeCount', order: 'descending' }"
        @sort-change="onSortChange"
        :rowClassFn="rowClassFn"
        stripe
    >
        <template #cell-name="{ row }">
            <el-tooltip placement="right" effect="light" popper-class="card-tooltip">
                <template #content>
                    <el-image
                        :src="`${row.urlFront}`"
                        fit="contain"
                        :alt="row.name"
                        :class="'card-image ' + row.setCode?.toLowerCase()"
                    />
                </template>
                <el-link @click="openCardDetailDialog(row.oracleId)">{{ row.name }}</el-link>
            </el-tooltip>
        </template>

        <template #cell-effectiveColors="{ row }">
            <i
                v-for="color in row.effectiveColors"
                :key="color"
                :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                style="margin-right: 4px;"
            ></i>
        </template>

        <template #cell-effectiveColorIdentity="{ row }">
            <i
                v-for="color in row.effectiveColorIdentity"
                :key="color"
                :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                style="margin-right: 4px;"
            ></i>
        </template>

        <template #cell-tags="{ row }">
            <div class="tag-list flex gap-2">
                <el-tag
                    v-for="tag in filteredTags(row.tags)"
                    :key="tag"
                    size="small"
                    type="info"
                    :color="getTagColor(tag)"
                    disable-transitions
                >
                    {{ tag }}
                </el-tag>
            </div>
        </template>

        <template #cell-minRarity="{ row }">
            <el-tag
                v-if="row.minRarity"
                size="small"
                type="info"
                :color="getRarityColor(row.minRarity)"
                disable-transitions
            >{{ capitalizeFirstLetter(row.minRarity) }}</el-tag>
        </template>

        <template #cell-power="{ row }">
            <span>{{ row.power ?? '&mdash;' }}</span>
        </template>

        <template #cell-toughness="{ row }">
            <span>{{ row.toughness ?? '&mdash;' }}</span>
        </template>

        <template #cell-isUniversesBeyond="{ row }">
            <el-tag v-if="row.isUniversesBeyond" type="success" size="small">Yes</el-tag>
            <el-tag v-else type="info" size="small">No</el-tag>
        </template>

        <template #cell-isSupplementalProduct="{ row }">
            <el-tag v-if="row.isSupplementalProduct" type="success" size="small">Yes</el-tag>
            <el-tag v-else type="info" size="small">No</el-tag>
        </template>

        <template #cell-makesTokens="{ row }">
            <el-tag v-if="row.makesTokens" type="success" size="small">Yes</el-tag>
            <el-tag v-else type="info" size="small">No</el-tag>
        </template>

        <template #cell-games="{ row }">
            <div class="tag-list flex gap-2">
                <el-tag
                    v-for="game in row.games"
                    :key="game"
                    size="small"
                    type="info"
                    :color="getGameTagColor(game)"
                    disable-transitions
                >
                    {{ game }}
                </el-tag>
            </div>
        </template>
    </StickyTable>

    <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        :pager-count="5"
        :layout="paginationLayout"
        :total="filteredRows.length"
    />



    <!-- Column Customization Dialog -->
    <el-dialog
        v-model="columnCustomizationVisible"
        title="Customize Columns"
        width="600"
        align-center
    >
        <div v-for="group in columnOptions" :key="group.label" style="margin-bottom: 1em;">
            <div class="column-group-header">
                <el-checkbox
                    :model-value="isGroupAllChecked(group.options)"
                    :indeterminate="isGroupIndeterminate(group.options)"
                    @change="(v) => toggleGroupColumns(group.options, v as boolean)"
                ><strong>{{ group.label }}</strong></el-checkbox>
            </div>
            <el-checkbox-group v-model="config.visibleColumns" style="width: 100%;">
                <el-row :gutter="10">
                    <el-col :span="12" :xs="24" v-for="item in group.options" :key="item.value">
                        <el-checkbox :label="item.value">
                            {{ item.label }}
                        </el-checkbox>
                    </el-col>
                </el-row>
            </el-checkbox-group>
        </div>

        <template #footer>
            <el-button @click="columnCustomizationVisible = false">Close</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { Menu, Grid, List } from '@element-plus/icons-vue';
import { bindStorage } from '../util/VueLocalStorage';
import { capitalizeFirstLetter, rarityOrder, getRarityColor } from '../util/HelperFunctions';
import StickyTable from './StickyTable.vue';
import type { StickyTableColumn } from '../types/StickyTableColumn';
import CardSearchInput from './filters/CardSearchInput.vue';
import { parseQuery } from '../util/CardFilterParser';
import { evaluateCard, computeHighlightedOracleIds } from '../util/CardFilterEvaluator';
import { getSetReleaseDates } from '../util/CubeFunctions';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    similarityMatrix: {
        type: Object,
        required: true,
    },
    overviewTableData: {
        type: Array,
        required: true,
    },
});

const openCardDetailDialog = inject('openCardDetailDialog');

const currentPage = ref(1);
const pageSize = ref(50);
const activeSort = ref<{ prop: string; order: 'ascending' | 'descending' | null } | null>({ prop: 'cubeCount', order: 'descending' });
const activeQuery = ref('');
const activeCubeFilter = ref<Record<string, boolean | null>>({});
const columnCustomizationVisible = ref(false);
const visualDisplayVisible = ref(false);

const visualSortProp = computed({
    get: () => activeSort.value?.prop ?? 'cubeCount',
    set: (val: string) => {
        activeSort.value = { prop: val, order: activeSort.value?.order ?? 'descending' };
        currentPage.value = 1;
    },
});

const visualSortOrder = computed({
    get: () => activeSort.value?.order ?? 'descending',
    set: (val: 'ascending' | 'descending') => {
        activeSort.value = { prop: activeSort.value?.prop ?? 'cubeCount', order: val };
        currentPage.value = 1;
    },
});

const toggleVisualSortOrder = () => {
    visualSortOrder.value = visualSortOrder.value === 'ascending' ? 'descending' : 'ascending';
};

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value <= 760);

const paginationLayout = computed(() => {
    return isMobile.value ? 'prev, pager, next' : '->, prev, pager, next, sizes';
});

// --- Column visibility config ---
const defaultVisibleColumns = [
    'cubeCount', 'effectiveColors', 'cmc', 'typeLine', 'tags',
    'minRarity', 'setCode', 'releaseDate', 'minPriceUsd',
];

const defaultConfig = {
    visibleColumns: [...defaultVisibleColumns],
};

const config = bindStorage('card-summary-table-config', (v) => {
    if (v == undefined || v === null) {
        return { ...defaultConfig };
    }
    return {
        visibleColumns: Array.isArray(v.visibleColumns) ? v.visibleColumns : [...defaultVisibleColumns],
    };
});

const isGroupAllChecked = (options: { value: string }[]) =>
    options.every(o => config.value.visibleColumns.includes(o.value));

const isGroupIndeterminate = (options: { value: string }[]) => {
    const someChecked = options.some(o => config.value.visibleColumns.includes(o.value));
    return someChecked && !isGroupAllChecked(options);
};

const toggleGroupColumns = (options: { value: string }[], checked: boolean) => {
    if (checked) {
        const toAdd = options.map(o => o.value).filter(v => !config.value.visibleColumns.includes(v));
        config.value.visibleColumns = [...config.value.visibleColumns, ...toAdd];
    } else {
        const values = new Set(options.map(o => o.value));
        config.value.visibleColumns = config.value.visibleColumns.filter(v => !values.has(v));
    }
};

const columnOptions = ref([
    {
        label: 'Core',
        options: [
            { value: 'cubeCount', label: 'Cubes' },
            { value: 'count', label: 'Total Count' },
            { value: 'effectiveColors', label: 'Colors' },
            { value: 'effectiveColorIdentity', label: 'Color Identity' },
            { value: 'cmc', label: 'Mana Value' },
            { value: 'power', label: 'Power' },
            { value: 'toughness', label: 'Toughness' },
            { value: 'typeLine', label: 'Type Line' },
            { value: 'elo', label: 'Elo' },
            { value: 'popularity', label: 'Popularity' },
            { value: 'tags', label: 'Tags' },
            { value: 'minRarity', label: 'Min Rarity' },
        ],
    },
    {
        label: 'Set & Release',
        options: [
            { value: 'setCode', label: 'Set' },
            { value: 'setType', label: 'Set Type' },
            { value: 'layout', label: 'Layout' },
            { value: 'releaseDate', label: 'Release Date' },
        ],
    },
    {
        label: 'Pricing',
        options: [
            { value: 'minPriceUsd', label: 'Min Price (USD)' },
            { value: 'minPriceTix', label: 'Min Price (Tix)' },
        ],
    },
    {
        label: 'Characteristics',
        options: [
            { value: 'oracleTextWordCount', label: 'Word Count (incl. Reminder Text)' },
            { value: 'oracleTextWordCountMinusParen', label: 'Word Count' },
            { value: 'isUniversesBeyond', label: 'Universes Beyond' },
            { value: 'isSupplementalProduct', label: 'Supplemental Product' },
            { value: 'makesTokens', label: 'Makes Tokens' },
            { value: 'games', label: 'Games' },
        ],
    },
]);

// --- Table column definitions ---
const tableColumns = computed<StickyTableColumn[]>(() => [
    { key: 'index', prop: 'index', label: '#', width: '50px' },
    { key: 'name', prop: 'name', label: 'Name', minWidth: '120px', maxWidth: '240px', showOverflowTooltip: true, sortable: true },
    { key: 'cubeCount', prop: 'cubeCount', label: 'Cubes', minWidth: '75px', align: 'center', sortable: true, visible: config.value.visibleColumns.includes('cubeCount') },
    { key: 'count', prop: 'count', label: 'Count', minWidth: '75px', align: 'center', sortable: true, tooltip: 'Total copies across all loaded cubes', visible: config.value.visibleColumns.includes('count') },
    { key: 'effectiveColors', prop: 'effectiveColors', label: 'Colors', minWidth: '75px', align: 'center', tooltip: 'Actual card colors', visible: config.value.visibleColumns.includes('effectiveColors') },
    { key: 'effectiveColorIdentity', prop: 'effectiveColorIdentity', label: 'Color ID', minWidth: '75px', align: 'center', tooltip: 'Color Identity', visible: config.value.visibleColumns.includes('effectiveColorIdentity') },
    { key: 'cmc', prop: 'cmc', label: 'MV', minWidth: '60px', align: 'center', sortable: true, tooltip: 'Mana Value', visible: config.value.visibleColumns.includes('cmc') },
    { key: 'power', prop: 'power', label: 'Pow', minWidth: '55px', align: 'center', sortable: true, tooltip: 'Power', visible: config.value.visibleColumns.includes('power') },
    { key: 'toughness', prop: 'toughness', label: 'Tou', minWidth: '55px', align: 'center', sortable: true, tooltip: 'Toughness', visible: config.value.visibleColumns.includes('toughness') },
    { key: 'typeLine', prop: 'typeLine', label: 'Type', minWidth: '100px', maxWidth: '220px', showOverflowTooltip: true, sortable: true, tooltip: 'Type Line', visible: config.value.visibleColumns.includes('typeLine') },
    { key: 'elo', prop: 'elo', label: 'Elo', minWidth: '75px', align: 'center', sortable: true, formatter: (row: any) => row.elo != null ? row.elo.toFixed(0) : 'N/A', tooltip: 'CubeCobra Elo Rating', visible: config.value.visibleColumns.includes('elo') },
    { key: 'popularity', prop: 'popularity', label: 'Pop.', minWidth: '70px', align: 'center', sortable: true, formatter: (row: any) => row.popularity != null ? `${row.popularity.toFixed(2)} %` : 'N/A', tooltip: 'CubeCobra Popularity %', visible: config.value.visibleColumns.includes('popularity') },
    { key: 'tags', prop: 'tags', label: 'Tags', minWidth: '75px', visible: config.value.visibleColumns.includes('tags') },
    { key: 'minRarity', prop: 'minRarity', label: 'Min Rarity', minWidth: '75px', sortable: true, tooltip: 'Minimum rarity across all printings', visible: config.value.visibleColumns.includes('minRarity') },
    { key: 'setCode', prop: 'setCode', label: 'Set', minWidth: '60px', sortable: true, visible: config.value.visibleColumns.includes('setCode') },
    { key: 'setType', prop: 'setType', label: 'Set Type', minWidth: '90px', maxWidth: '130px', showOverflowTooltip: true, sortable: true, visible: config.value.visibleColumns.includes('setType') },
    { key: 'layout', prop: 'layout', label: 'Layout', minWidth: '75px', sortable: true, visible: config.value.visibleColumns.includes('layout') },
    { key: 'releaseDate', prop: 'releaseDate', label: 'Released', minWidth: '90px', sortable: true, tooltip: 'Release Date', visible: config.value.visibleColumns.includes('releaseDate') },
    { key: 'minPriceUsd', prop: 'minPriceUsd', label: 'Price (USD)', minWidth: '75px', sortable: true, formatter: (row: any) => row.minPriceUsd != null ? `$${row.minPriceUsd.toFixed(2)}` : 'N/A', tooltip: 'Minimum price in USD across all printings', visible: config.value.visibleColumns.includes('minPriceUsd') },
    { key: 'minPriceTix', prop: 'minPriceTix', label: 'Price (Tix)', minWidth: '75px', sortable: true, formatter: (row: any) => row.minPriceTix != null ? row.minPriceTix.toFixed(2) : 'N/A', tooltip: 'Minimum price in MTGO Tix across all printings', visible: config.value.visibleColumns.includes('minPriceTix') },
    { key: 'oracleTextWordCount', prop: 'oracleTextWordCount', label: 'Words', minWidth: '65px', align: 'center', sortable: true, tooltip: 'Oracle Text Word Count (including Reminder Text)', visible: config.value.visibleColumns.includes('oracleTextWordCount') },
    { key: 'oracleTextWordCountMinusParen', prop: 'oracleTextWordCountMinusParen', label: 'Words*', minWidth: '65px', align: 'center', sortable: true, tooltip: 'Oracle Text Word Count (excluding Reminder Text)', visible: config.value.visibleColumns.includes('oracleTextWordCountMinusParen') },
    { key: 'isUniversesBeyond', prop: 'isUniversesBeyond', label: 'UB', minWidth: '50px', align: 'center', tooltip: 'Universes Beyond — originally from a non-Magic IP product', visible: config.value.visibleColumns.includes('isUniversesBeyond') },
    { key: 'isSupplementalProduct', prop: 'isSupplementalProduct', label: 'Supp.', minWidth: '55px', align: 'center', tooltip: 'Supplemental Product — originally from a supplemental product (includes Portal)', visible: config.value.visibleColumns.includes('isSupplementalProduct') },
    { key: 'makesTokens', prop: 'makesTokens', label: 'Tokens', minWidth: '65px', align: 'center', tooltip: 'Makes one or more Tokens', visible: config.value.visibleColumns.includes('makesTokens') },
    { key: 'games', prop: 'games', label: 'Games', minWidth: '75px', visible: config.value.visibleColumns.includes('games') },
]);

const visualSortOptions = computed(() => {
    return tableColumns.value
        .filter(col => col.sortable && col.visible !== false && col.prop != null)
        .map(col => ({ label: col.label, value: col.prop as string }));
});

// Reset sort prop if the sorted column is hidden
watch(visualSortOptions, (options) => {
    if (!options.some(o => o.value === activeSort.value?.prop)) {
        const first = options[0];
        if (first) {
            activeSort.value = { prop: first.value, order: activeSort.value?.order ?? 'descending' };
        }
    }
});

// --- Tag / game display helpers ---
const tagsMeta = [
    { value: 'counterspell', color: 'rgba(20, 155, 226, 0.3)' },
    { value: 'draw', color: 'rgba(30, 144, 255, 0.3)' },
    { value: 'flicker', color: 'rgba(255, 140, 0, 0.3)' },
    { value: 'ramp', color: 'rgba(60, 179, 113, 0.3)' },
    { value: 'removal', color: 'rgba(255, 99, 71, 0.3)' },
    { value: 'token', color: 'rgba(255, 215, 0, 0.3)' },
    { value: 'tutor', color: 'rgba(153, 102, 255, 0.3)' },
];

const gamesMeta = [
    { value: 'paper', color: 'rgba(34, 139, 34, 0.3)' },
    { value: 'mtgo', color: 'rgba(70, 130, 180, 0.3)' },
    { value: 'arena', color: 'rgba(218, 112, 214, 0.3)' },
];

const filteredTags = (cardTags: string[]) => {
    return cardTags.filter(tag => tagsMeta.some(t => t.value.toLowerCase() === tag.toLowerCase()));
};

const getTagColor = (tag: string) => {
    return tagsMeta.find(t => t.value.toLowerCase() === tag.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};

const getGameTagColor = (game: string) => {
    return gamesMeta.find(g => g.value.toLowerCase() === game.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};

// --- Tristate filter helper for the cube dropdown ---
const applyTristateFilter = (
    map: Record<string, boolean | null>,
    rowValues: string[],
    matchAll: boolean = false,
): boolean => {
    const includes: string[] = [];
    const excludes: string[] = [];
    for (const [key, val] of Object.entries(map)) {
        if (val === true) includes.push(key);
        else if (val === false) excludes.push(key);
    }
    for (const ex of excludes) {
        if (rowValues.some(v => v.toLowerCase() === ex.toLowerCase())) return false;
    }
    if (includes.length > 0) {
        if (matchAll) {
            for (const inc of includes) {
                if (!rowValues.some(v => v.toLowerCase() === inc.toLowerCase())) return false;
            }
        } else {
            const hasAny = includes.some(inc => rowValues.some(v => v.toLowerCase() === inc.toLowerCase()));
            if (!hasAny) return false;
        }
    }
    return true;
};

const parsedQuery = computed(() => parseQuery(activeQuery.value));

const highlightedOracleIds = computed<Set<string> | null>(() => {
    if (!parsedQuery.value.ast) return null;
    return computeHighlightedOracleIds(
        parsedQuery.value.ast,
        tableData.value,
        { loadedCubes: props.loadedCubes, setDates: getSetReleaseDates() },
    );
});

const rowClassFn = (row: any): string => {
    if (!highlightedOracleIds.value) return '';
    return highlightedOracleIds.value.has(row.oracleId) ? 'row--highlighted' : 'row--dimmed';
};

watch([activeQuery, activeCubeFilter], () => {
    currentPage.value = 1;
});

const onSortChange = (sortInfo: { prop: string; order: 'ascending' | 'descending' | null }) => {
    activeSort.value = sortInfo;
    currentPage.value = 1;
};

// --- CSV Export ---
const exportToCsv = () => {
    const escapeCsvValue = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const headers = [
        'Index', 'Name', 'Cubes', 'Total Count', 'Colors', 'Color Identity', 'Mana Value',
        'Elo', 'Popularity', 'Type Line', 'Tags', 'Min Rarity',
        'Set Code', 'Set Type', 'Layout', 'Release Date',
        'Min Price (USD)', 'Min Price (Tix)',
        'Word Count', 'Word Count (No Reminder)',
        'Universes Beyond', 'Supplemental', 'Makes Tokens', 'Games',
    ].map(escapeCsvValue).join(',');

    const csvRows = filteredRows.value.map(row => [
        row.index,
        row.name,
        row.cubeCount,
        row.count,
        row.effectiveColors.join(''),
        row.effectiveColorIdentity.join(''),
        row.cmc ?? '',
        row.elo ?? '',
        row.popularity ?? '',
        row.typeLine,
        row.tags.join(', '),
        row.minRarity ?? '',
        row.setCode ?? '',
        row.setType ?? '',
        row.layout ?? '',
        row.releaseDate ?? '',
        row.minPriceUsd != null ? `$${row.minPriceUsd.toFixed(2)}` : '',
        row.minPriceTix != null ? row.minPriceTix.toFixed(2) : '',
        row.oracleTextWordCount ?? '',
        row.oracleTextWordCountMinusParen ?? '',
        row.isUniversesBeyond ? 'Yes' : 'No',
        row.isSupplementalProduct ? 'Yes' : 'No',
        row.makesTokens ? 'Yes' : 'No',
        (row.games ?? []).join(', '),
    ].map(escapeCsvValue).join(','));

    const csvContent = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `cube-cards-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- Data pipeline ---
const tableData = computed(() => {
    if (Object.keys(props.loadedCubes).length === 0) {
        return [];
    }
    const allCards = Object.keys(props.loadedCubes).reduce((acc, key) => {
        props.loadedCubes[key].cards.forEach(card => {
            if (acc[card.oracleId] === undefined) {
                acc[card.oracleId] = {
                    ...card,
                    isRemoval: card.tags.includes('removal'),
                    effectiveColors: (!card.colors || card.colors.length === 0) ? ['C'] : card.colors,
                    effectiveColorIdentity: (!card.colorIdentity || card.colorIdentity.length === 0) ? ['C'] : card.colorIdentity,
                    count: 0,
                    cubes: [],
                    cubeCount: 0,
                };
            }
            acc[card.oracleId].count += 1;
            if (!acc[card.oracleId].cubes.includes(key)) {
                acc[card.oracleId].cubes.push(key);
                acc[card.oracleId].cubeCount += 1;
            }
        });
        return acc;
    }, {});

    return Object.values(allCards);
});

const sortedRows = computed(() => {
    const alphaSorted = tableData.value.slice(0).sort((a, b) => {
        if (a['name'] < b['name']) return -1;
        if (a['name'] > b['name']) return 1;
        return 0;
    });

    if (!activeSort.value || !activeSort.value.order) {
        return alphaSorted;
    }

    return alphaSorted.slice(0).sort((a, b) => {
        const sortKey = activeSort.value.prop;
        const dir = activeSort.value.order === 'ascending' ? 1 : -1;

        // Rarity sorting with defined ordering
        if (sortKey === 'minRarity') {
            const aVal = rarityOrder[a.minRarity] ?? -1;
            const bVal = rarityOrder[b.minRarity] ?? -1;
            if (aVal !== bVal) return (aVal - bVal) * dir;
            return a.name.localeCompare(b.name);
        }

        // Power/toughness: parse numerically, non-numeric values (*, 1+*) sort last
        if (sortKey === 'power' || sortKey === 'toughness') {
            const aVal = parseFloat(a[sortKey]) ?? -1;
            const bVal = parseFloat(b[sortKey]) ?? -1;
            const aNum = isNaN(aVal) ? -1 : aVal;
            const bNum = isNaN(bVal) ? -1 : bVal;
            if (aNum !== bNum) return (aNum - bNum) * dir;
            return a.name.localeCompare(b.name);
        }

        if (a[sortKey] < b[sortKey]) return -1 * dir;
        if (a[sortKey] > b[sortKey]) return 1 * dir;
        // Secondary sort by name
        return a.name.localeCompare(b.name);
    });
});

const filteredRows = computed(() => {
    const hasCubeFilter = Object.keys(activeCubeFilter.value).length > 0;
    const hasTextQuery = !!activeQuery.value.trim() && !!parsedQuery.value.ast;

    let rows = sortedRows.value;

    if (hasCubeFilter) {
        rows = rows.filter(row => applyTristateFilter(activeCubeFilter.value, row.cubes));
    }

    if (hasTextQuery) {
        rows = rows.filter(row =>
            evaluateCard(parsedQuery.value.ast, row, { loadedCubes: props.loadedCubes, setDates: getSetReleaseDates() }),
        );
    }

    return rows.map((row, index) => ({
        ...row,
        index: index + 1,
    }));
});

const visibleRows = computed(() => {
    return filteredRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});
</script>

<style lang="scss">
.card-table-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    @media (max-width: 600px) {
        .card-table-search {
            flex-basis: 100%;
        }
    }
}

.card-table-search {
    flex: 1;
    min-width: 0;
}

.card-table-pagination-row {
    display: flex;
    align-items: center;
    gap: 12px;

    .el-pagination {
        flex: 1;
        margin: 8px 0;
    }
}

.visual-sort-bar {
    margin: 12px 0 8px;

    .sort-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
    }
}

.visual-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 300px));
    gap: 12px;
    justify-content: center;
}

.visual-card-item {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;

    &:hover .card-image {
        opacity: 0.85;
    }
}

.visual-card-label {
    margin-top: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.el-pagination {
    margin: 16px 0;
    text-align: right;
}

.card-image {
    border-radius: 4.75% / 3.5%;

    &.lea {
        border-radius: 7% / 5.5%;
    }
}

.expanded-content .card-image {
    max-width: 400px;
    height: auto;
}

.tag-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.row-rarities {
    margin-top: 10px;
    text-align: center;

    .el-text {
        line-height: 1.5em;
    }
}

.el-popper.card-tooltip {
    padding: 6px 8px;
    width: 250px;
    height: 350px;

    .card-image {
        width: 100%;
        height: auto;
    }
}

.flex.justify-center {
    justify-content: center;
}

.column-group-header {
    background-color: var(--el-fill-color);
    border-radius: var(--el-border-radius-base);
    padding: 6px 10px;
    margin-bottom: 6px;
}

// ── Highlight / dim styles ──────────────────────────────────────────────────

.sticky-table__row.row--highlighted {
    background-color: rgba(103, 194, 58, 0.12);
    box-shadow: inset 3px 0 0 var(--el-color-success);
}

.sticky-table__row.row--dimmed {
    opacity: 0.5;
}

.visual-card-item.card-item--highlighted .card-image {
    box-shadow: 0 0 0 3px var(--el-color-success);
    border-radius: 4.75% / 3.5%;
}

.visual-card-item.card-item--dimmed {
    opacity: 0.5;
}
</style>
