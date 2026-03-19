<template>
    <el-row direction="horizontal" :gutter="20">
        <el-col :span="12" :xs="24">
            <el-space>
                <el-button @click="resetAllFilters">Reset Filters</el-button>
                <el-button @click="columnCustomizationVisible = true">Columns</el-button>
                <el-button @click="exportToCsv" type="primary">Export CSV</el-button>
            </el-space>
        </el-col>
        <el-col :span="12" :xs="24" class="filtered-count">
            <el-text tag="i">Filtered to {{ filteredRows.length }} / {{ sortedRows.length }} Cards</el-text>
        </el-col>
    </el-row>

    <CardTableFilters
        ref="cardTableFiltersRef"
        :loadedCubes="loadedCubes"
        @update:filters="onFiltersUpdated"
    />

    <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        :pager-count="5"
        :layout="paginationLayout"
        :total="filteredRows.length"
    />

    <el-table
        ref="cardSummaryTableRef"
        :data="visibleRows"
        :default-sort="{ prop: 'cubeCount', order: 'descending' }"
        :preserve-expanded-content="false"
        @sort-change="onSortChange"
        style="width: 100%"
        table-layout="auto"
        stripe
    >
        <el-table-column :fixed="!isMobile" width="25" type="expand">
            <template #default="props">
                <el-row class="expanded-content" :gutter="20" justify="space-around">
                    <el-col :span="8" :xs="24" :sm="24" :md="8" :xl="8">
                        <div style="text-align:center">
                            <el-image
                                :src="`${props.row.urlFront}`"
                                fit="contain"
                                :alt="props.row.name"
                                :class="'card-image ' + props.row.setCode?.toLowerCase()"
                            />
                        </div>

                        <el-row justify="center" :gutter="10" class="row-games" style="margin-top: 10px; text-align: center;">
                            <el-col :span="24">
                                <div class="tag-list flex gap-2 justify-center">
                                    <el-tag
                                        v-for="game in props.row.games"
                                        :key="game"
                                        size="small"
                                        type="info"
                                        :color="getGameTagColor(game)"
                                        disable-transitions
                                    >
                                        {{ game }}
                                    </el-tag>
                                </div>
                            </el-col>
                        </el-row>

                        <el-row justify="center" :gutter="10" class="row-rarities" style="margin-top: 10px; text-align: center;">
                            <el-col :span="24">
                                <el-text>Original Rarity: {{ capitalizeFirstLetter(props.row.rarity) }}</el-text>
                            </el-col>
                            <el-col :span="24">
                                <el-text>Minimum Rarity: {{ capitalizeFirstLetter(props.row.minRarity) }}</el-text>
                            </el-col>
                        </el-row>
                    </el-col>
                    <el-col :span="16" :xs="24" :sm="24" :md="16" :xl="16">
                        <el-row direction="horizontal">
                            <el-col :span="12" :xs="24" :sm="24" :md="12" :xl="12">
                                <h3>Included In ({{ props.row.cubeCount }}):</h3>
                                <template v-for="cube in expandedCubeList(props.row.cubes)" :key="cube.key">
                                    <div v-if="cube.included">
                                        <el-row direction="horizontal">
                                            <el-col :span="16">
                                                <el-tooltip :content="`Owner: ${cube.owner}`" placement="top" :hide-after="50">
                                                    <el-link @click="openCubeDetailDialog(cube.id)">{{ cube.name }}</el-link>
                                                </el-tooltip>
                                            </el-col>
                                            <el-col :span="8">
                                                <el-text tag="i">({{ cube.size }} Cards)</el-text>
                                            </el-col>
                                        </el-row>
                                    </div>
                                </template>
                            </el-col>
                            <el-col :span="12" :xs="24" :sm="24" :md="12" :xl="12">
                                <h3>Not Included In ({{ expandedCubeList(props.row.cubes).length - props.row.cubeCount }}):</h3>
                                <template v-for="cube in expandedCubeList(props.row.cubes)" :key="cube.key">
                                    <div v-if="!cube.included">
                                        <el-row direction="horizontal">
                                            <el-col :span="16">
                                                <el-tooltip :content="`Owner: ${cube.owner}`" placement="top" :hide-after="50">
                                                    <el-link @click="openCubeDetailDialog(cube.id)">{{ cube.name }}</el-link>
                                                </el-tooltip>
                                            </el-col>
                                            <el-col :span="8">
                                                <el-text tag="i">({{ cube.size }} Cards)</el-text>
                                            </el-col>
                                        </el-row>
                                    </div>
                                </template>
                            </el-col>
                        </el-row>
                    </el-col>
                </el-row>
            </template>
        </el-table-column>

        <el-table-column :fixed="!isMobile" prop="index" label="#" width="50" />

        <el-table-column prop="name" label="Name" min-width="150" max-width="300" sortable="custom">
            <template #default="{ row }">
                <el-tooltip placement="right" effect="light" popper-class="card-tooltip">
                    <template #content>
                        <el-image
                            :src="`${row.urlFront}`"
                            fit="contain"
                            :alt="row.name"
                            :class="'card-image ' + row.setCode?.toLowerCase()"
                        />
                    </template>
                    <el-link :href="`https://scryfall.com/card/${row.setCode?.toLowerCase()}/${row.collectorNumber}`" target="_blank">{{ row.name }}</el-link>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('cubeCount')"
            prop="cubeCount"
            label="Cubes"
            min-width="75"
            max-width="100"
            :align="'center'"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('effectiveColors')"
            prop="effectiveColors"
            label="Colors"
            min-width="75"
            max-width="100"
            :align="'center'"
        >
            <template #default="{ row }">
                <i
                    v-for="color in row.effectiveColors"
                    :key="color"
                    :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                    style="margin-right: 4px;"
                ></i>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('cmc')"
            prop="cmc"
            label="MV"
            min-width="75"
            max-width="100"
            :align="'center'"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('typeLine')"
            prop="typeLine"
            label="Type Line"
            min-width="175"
            max-width="350"
            show-overflow-tooltip
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('tags')"
            prop="tags"
            label="Tags"
            min-width="75"
            max-width="250"
        >
            <template #default="{ row }">
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
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('minRarity')"
            prop="minRarity"
            label="Min Rarity"
            min-width="75"
            max-width="100"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('setCode')"
            prop="setCode"
            label="Set"
            min-width="75"
            max-width="100"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('setType')"
            prop="setType"
            label="Set Type"
            min-width="100"
            max-width="150"
            show-overflow-tooltip
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('layout')"
            prop="layout"
            label="Layout"
            min-width="75"
            max-width="100"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('releaseDate')"
            prop="releaseDate"
            label="Release Date"
            min-width="100"
            max-width="150"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('minPriceUsd')"
            prop="minPriceUsd"
            label="Min Price (USD)"
            min-width="75"
            max-width="100"
            :formatter="(row) => row.minPriceUsd != null ? `$${row.minPriceUsd.toFixed(2)}` : 'N/A'"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('minPriceTix')"
            prop="minPriceTix"
            label="Min Price (Tix)"
            min-width="75"
            max-width="100"
            :formatter="(row) => row.minPriceTix != null ? row.minPriceTix.toFixed(2) : 'N/A'"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('oracleTextWordCount')"
            prop="oracleTextWordCount"
            label="Word Count"
            min-width="75"
            max-width="100"
            :align="'center'"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('oracleTextWordCountMinusParen')"
            prop="oracleTextWordCountMinusParen"
            label="Words (No Reminder)"
            min-width="75"
            max-width="100"
            :align="'center'"
            sortable="custom"
        />

        <el-table-column
            v-if="config.visibleColumns.includes('isUniversesBeyond')"
            prop="isUniversesBeyond"
            label="UB"
            min-width="50"
            max-width="75"
            :align="'center'"
        >
            <template #default="{ row }">
                <el-tag v-if="row.isUniversesBeyond" type="warning" size="small">Yes</el-tag>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('isSupplementalProduct')"
            prop="isSupplementalProduct"
            label="Supplemental"
            min-width="50"
            max-width="100"
            :align="'center'"
        >
            <template #default="{ row }">
                <el-tag v-if="row.isSupplementalProduct" type="info" size="small">Yes</el-tag>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('makesTokens')"
            prop="makesTokens"
            label="Tokens"
            min-width="50"
            max-width="75"
            :align="'center'"
        >
            <template #default="{ row }">
                <el-tag v-if="row.makesTokens" type="success" size="small">Yes</el-tag>
            </template>
        </el-table-column>

        <el-table-column
            v-if="config.visibleColumns.includes('games')"
            prop="games"
            label="Games"
            min-width="75"
            max-width="150"
        >
            <template #default="{ row }">
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
        </el-table-column>
    </el-table>

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
            <h4>{{ group.label }}</h4>
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
import { TableInstance } from 'element-plus';
import type { SortBy } from 'element-plus';
import { ref, computed, inject } from 'vue';
import { capitalizeFirstLetter } from '../util/HelperFunctions';
import { bindStorage } from '../util/VueLocalStorage';
import CardTableFilters from './filters/CardTableFilters.vue';

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

const openCubeDetailDialog = inject('openCubeDetailDialog');

const cardSummaryTableRef = ref<TableInstance>();
const cardTableFiltersRef = ref<InstanceType<typeof CardTableFilters>>();
const currentPage = ref(1);
const pageSize = ref(50);
const activeSort = ref<SortBy | null>({ prop: 'cubeCount', order: 'descending' });
const activeFilterState = ref<Record<string, any>>({});
const columnCustomizationVisible = ref(false);

const isMobile = computed(() => {
    return screen.width <= 760;
});

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

const columnOptions = ref([
    {
        label: 'Core',
        options: [
            { value: 'cubeCount', label: 'Cubes' },
            { value: 'effectiveColors', label: 'Colors' },
            { value: 'cmc', label: 'Mana Value' },
            { value: 'typeLine', label: 'Type Line' },
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
            { value: 'oracleTextWordCount', label: 'Word Count' },
            { value: 'oracleTextWordCountMinusParen', label: 'Words (No Reminder)' },
            { value: 'isUniversesBeyond', label: 'Universes Beyond' },
            { value: 'isSupplementalProduct', label: 'Supplemental Product' },
            { value: 'makesTokens', label: 'Makes Tokens' },
            { value: 'games', label: 'Games' },
        ],
    },
]);

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

const expandedCubeList = (cubeKeys: string[]) => {
    return Object.entries(props.loadedCubes).map(([key, cube]) => ({
        id: cube.id,
        key: key,
        name: cube.name,
        owner: cube.owner,
        size: cube.cards.length,
        included: cubeKeys.includes(key),
    })).sort((a, b) => a.name.localeCompare(b.name));
};

// --- Rarity ordering for comparative filters ---
const rarityOrder: Record<string, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    mythic: 3,
};

// --- Comparative filter helper ---
const compareValues = (actual: number | undefined | null, comparison: string, target: number): boolean => {
    if (actual == null) return false;
    switch (comparison) {
        case 'eq': return actual === target;
        case 'neq': return actual !== target;
        case 'lt': return actual < target;
        case 'lte': return actual <= target;
        case 'gt': return actual > target;
        case 'gte': return actual >= target;
        default: return true;
    }
};

// --- Tristate filter helper (include/exclude on array-like or set-like fields) ---
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
    // Excludes: row must NOT contain any excluded value
    for (const ex of excludes) {
        if (rowValues.some(v => v.toLowerCase() === ex.toLowerCase())) return false;
    }
    // Includes
    if (includes.length > 0) {
        if (matchAll) {
            // Row must contain ALL included values
            for (const inc of includes) {
                if (!rowValues.some(v => v.toLowerCase() === inc.toLowerCase())) return false;
            }
        } else {
            // Row must contain at least one included value
            const hasAny = includes.some(inc => rowValues.some(v => v.toLowerCase() === inc.toLowerCase()));
            if (!hasAny) return false;
        }
    }
    return true;
};

// --- Events ---
const onFiltersUpdated = (filters: Record<string, any>) => {
    activeFilterState.value = filters;
    currentPage.value = 1;
};

const onSortChange = (sortInfo: SortBy) => {
    activeSort.value = sortInfo;
    currentPage.value = 1;
};

const resetAllFilters = () => {
    activeFilterState.value = {};
    currentPage.value = 1;
    cardTableFiltersRef.value?.resetFilters();
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
        'Index', 'Name', 'Cubes', 'Total Count', 'Colors', 'Mana Value',
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
                    effectiveColors: card.colorIdentity.length === 0 ? ['C'] : card.colorIdentity,
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

    if (!activeSort.value) {
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

        if (a[sortKey] < b[sortKey]) return -1 * dir;
        if (a[sortKey] > b[sortKey]) return 1 * dir;
        // Secondary sort by name
        return a.name.localeCompare(b.name);
    });
});

const filteredRows = computed(() => {
    const f = activeFilterState.value;
    const hasAnyFilter = Object.keys(f).length > 0;

    let rows = sortedRows.value;

    if (hasAnyFilter) {
        rows = rows.filter(row => {
            // Name search
            if (f.name && !row.name.toLowerCase().includes(f.name.toLowerCase())) return false;

            // Oracle text search
            if (f.oracleText && !(row.oracleText ?? '').toLowerCase().includes(f.oracleText.toLowerCase())) return false;

            // Cubes (tristate: include at least one / exclude any)
            if (f.cubes && Object.keys(f.cubes).length > 0) {
                if (!applyTristateFilter(f.cubes, row.cubes)) return false;
            }

            // Colors (tristate, with exact-match option)
            if (f.colors && Object.keys(f.colors).length > 0) {
                const includes: string[] = [];
                const excludes: string[] = [];
                for (const [key, val] of Object.entries(f.colors)) {
                    if (val === true) includes.push(key);
                    else if (val === false) excludes.push(key);
                }
                const rowColors = row.effectiveColors.map((c: string) => c.toUpperCase());

                for (const ex of excludes) {
                    if (rowColors.includes(ex.toUpperCase())) return false;
                }

                if (includes.length > 0) {
                    if (f.colorsExactMatch) {
                        // Exact match: row must have exactly the included colors
                        const includesSet = new Set(includes.map(c => c.toUpperCase()));
                        const rowSet = new Set(rowColors);
                        if (includesSet.size !== rowSet.size) return false;
                        for (const c of includesSet) {
                            if (!rowSet.has(c)) return false;
                        }
                    } else {
                        // At least one included color must be present
                        const hasAny = includes.some(inc => rowColors.includes(inc.toUpperCase()));
                        if (!hasAny) return false;
                    }
                }
            }

            // Mana Value (comparative)
            if (f.cmcComparison) {
                if (!compareValues(row.cmc, f.cmcComparison, f.cmcValue)) return false;
            }

            // Type Line (tristate on type strings, checking if typeLine includes)
            if (f.types && Object.keys(f.types).length > 0) {
                for (const [type, val] of Object.entries(f.types)) {
                    const contains = row.typeLine.includes(type);
                    if (val === true && !contains) return false;
                    if (val === false && contains) return false;
                }
            }

            // Min Rarity (comparative with ordering)
            if (f.rarityComparison) {
                const rowRarityVal = rarityOrder[row.minRarity] ?? -1;
                const targetRarityVal = rarityOrder[f.rarityValue] ?? -1;
                if (!compareValues(rowRarityVal, f.rarityComparison, targetRarityVal)) return false;
            }

            // Tags (tristate)
            if (f.tags && Object.keys(f.tags).length > 0) {
                if (!applyTristateFilter(f.tags, row.tags, true)) return false;
            }

            // Set codes (multi-select, any match)
            if (f.setCodes && f.setCodes.length > 0) {
                if (!f.setCodes.includes(row.setCode?.toUpperCase())) return false;
            }

            // Set types (multi-select, any match)
            if (f.setTypes && f.setTypes.length > 0) {
                if (!f.setTypes.includes(row.setType)) return false;
            }

            // Release year (comparative)
            if (f.releaseYearComparison) {
                if (!compareValues(row.releaseYear, f.releaseYearComparison, f.releaseYearValue)) return false;
            }

            // Price USD (comparative)
            if (f.priceUsdComparison) {
                if (!compareValues(row.minPriceUsd, f.priceUsdComparison, f.priceUsdValue)) return false;
            }

            // Price Tix (comparative)
            if (f.priceTixComparison) {
                if (!compareValues(row.minPriceTix, f.priceTixComparison, f.priceTixValue)) return false;
            }

            // Layouts (multi-select, any match)
            if (f.layouts && f.layouts.length > 0) {
                if (!f.layouts.includes(row.layout)) return false;
            }

            // Legality (single format, must be 'legal')
            if (f.legality) {
                const legalities = row.legality ?? {};
                if (legalities[f.legality] !== 'legal') return false;
            }

            // Universes Beyond (tristate boolean)
            if (f.isUniversesBeyond === true && !row.isUniversesBeyond) return false;
            if (f.isUniversesBeyond === false && row.isUniversesBeyond) return false;

            // Supplemental Product (tristate boolean)
            if (f.isSupplementalProduct === true && !row.isSupplementalProduct) return false;
            if (f.isSupplementalProduct === false && row.isSupplementalProduct) return false;

            // Makes Tokens (tristate boolean)
            if (f.makesTokens === true && !row.makesTokens) return false;
            if (f.makesTokens === false && row.makesTokens) return false;

            // Word count (comparative)
            if (f.wordCountComparison) {
                if (!compareValues(row.oracleTextWordCount, f.wordCountComparison, f.wordCountValue)) return false;
            }

            // Games (tristate)
            if (f.games && Object.keys(f.games).length > 0) {
                if (!applyTristateFilter(f.games, row.games ?? [], true)) return false;
            }

            // Keywords (multi-select, row must have all selected keywords)
            if (f.keywords && f.keywords.length > 0) {
                const rowKeywords = (row.keywords ?? []).map((k: string) => k.toLowerCase());
                for (const kw of f.keywords) {
                    if (!rowKeywords.includes(kw.toLowerCase())) return false;
                }
            }

            return true;
        });
    }

    // Number rows after filtering
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
.filtered-count {
    text-align: right;
    line-height: 2em;

    @media (max-width: 760px) {
        text-align: left;
        margin-top: 8px;
    }
}

.el-pagination {
    margin: 16px auto;
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
</style>
