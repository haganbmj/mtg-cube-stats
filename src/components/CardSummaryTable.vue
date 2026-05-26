<template>
    <div class="card-table-toolbar">
        <CardSearchInput
            class="card-table-search"
            v-model="activeQuery"
            :loadedCubes="loadedCubes"
            v-model:cubeFilter="activeCubeFilter"
            v-model:cubeFilterMode="activeCubeFilterMode"
            :collapseCubeFilter="isMobile"
        />
        <div v-show="!isMobile" class="card-table-toolbar-secondary">
            <el-dropdown trigger="click" :hide-on-click="false">
                <el-button :type="config.showAllCards ? 'primary' : ''" title="Show all Scryfall cards with global rates, independent of loaded cubes">All Cards</el-button>
                <template #dropdown>
                    <div class="all-cards-dropdown">
                        <el-checkbox v-model="config.showAllCards" class="all-cards-dropdown__toggle">Show All Cards</el-checkbox>
                        <div class="all-cards-dropdown__label">Frequency Category</div>
                        <el-select
                            v-if="frequencyCategoryOptions.length > 0"
                            v-model="config.frequencyCategory"
                            size="small"
                            style="width: 220px;"
                            placeholder="Global Rate"
                        >
                            <el-option-group
                                v-for="grp in groupedFrequencyOptions"
                                :key="grp.label"
                                :label="grp.label"
                            >
                                <el-option
                                    v-for="opt in grp.options"
                                    :key="opt.value"
                                    :label="opt.label"
                                    :value="opt.value"
                                />
                            </el-option-group>
                        </el-select>
                    </div>
                </template>
            </el-dropdown>
        </div>
        <span v-if="isMobile" class="card-table-filter-toggle" @click="filtersExpanded = !filtersExpanded">
            {{ filtersExpanded ? '▴ Filters' : '▾ Filters' }}
        </span>
        <span v-if="isMobile" style="flex: 1;"></span>
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
                    <el-dropdown-item divided @click="config.showAllCards = !config.showAllCards">Show All Cards{{ config.showAllCards ? ' ✓' : '' }}</el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>

    <div v-if="isMobile && filtersExpanded" class="card-table-mobile-filters">
        <TristateSelect
            v-if="Object.keys(loadedCubes).length > 0"
            :modelValue="activeCubeFilter"
            @update:modelValue="activeCubeFilter = $event"
            :options="cubeOptions"
            :showModeToggle="true"
            :mode="activeCubeFilterMode"
            @update:mode="activeCubeFilterMode = $event"
            placeholder="Filter by cube..."
        />
        <div class="mobile-filter-row">
            <el-dropdown trigger="click" :hide-on-click="false">
                <el-button :type="config.showAllCards ? 'primary' : ''" title="Show all Scryfall cards with global rates">All Cards</el-button>
                <template #dropdown>
                    <div class="all-cards-dropdown">
                        <el-checkbox v-model="config.showAllCards" class="all-cards-dropdown__toggle">Show All Cards</el-checkbox>
                        <div class="all-cards-dropdown__label">Frequency Category</div>
                        <el-select
                            v-if="frequencyCategoryOptions.length > 0"
                            v-model="config.frequencyCategory"
                            size="small"
                            style="width: 220px;"
                            placeholder="Global Rate"
                        >
                            <el-option-group
                                v-for="grp in groupedFrequencyOptions"
                                :key="grp.label"
                                :label="grp.label"
                            >
                                <el-option
                                    v-for="opt in grp.options"
                                    :key="opt.value"
                                    :label="opt.label"
                                    :value="opt.value"
                                />
                            </el-option-group>
                        </el-select>
                    </div>
                </template>
            </el-dropdown>
            <template v-if="visualDisplayVisible">
                <span style="flex: 1;"></span>
                <span class="sort-label">Columns</span>
                <el-input-number v-model="config.visualColumnCount" :min="1" :max="20" :step="1" size="small" style="width: 90px;" controls-position="right" />
            </template>
        </div>
        <template v-if="visualDisplayVisible">
            <div class="mobile-filter-row">
                <span class="sort-label">Sort by</span>
                <el-select v-model="visualSortProp" size="small" style="flex: 1;" :disabled="!!querySortDirective">
                    <el-option
                        v-for="opt in visualSortOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                    />
                </el-select>
                <el-button size="small" @click="toggleVisualSortOrder" :disabled="!!querySortDirective">
                    {{ visualSortOrder === 'ascending' ? '↑ Asc' : '↓ Desc' }}
                </el-button>
            </div>
        </template>
    </div>

    <div ref="cardResultsTop" class="card-table-pagination-row">
        <template v-if="isMobile">
            <el-button :disabled="currentPage <= 1" @click="currentPage--">Previous</el-button>
            <span class="mobile-page-info">{{ filteredRows.length }} / {{ sortedRows.length }} Cards</span>
            <el-button :disabled="currentPage >= totalPages" @click="currentPage++">Next</el-button>
        </template>
        <template v-else>
            <el-breadcrumb separator="·" class="filter-summary">
                <el-breadcrumb-item>
                    <el-tooltip :content="config.showAllCards ? `${filteredRows.length} unique cards match the active filters out of ${sortedRows.length} total cards in the Scryfall database` : `${filteredRows.length} unique cards match the active filters out of ${sortedRows.length} total unique cards across all loaded cubes`" placement="bottom" effect="light">
                        <span>{{ filteredRows.length }} / {{ sortedRows.length }} Cards</span>
                    </el-tooltip>
                </el-breadcrumb-item>
                <el-breadcrumb-item>
                    <el-tooltip :content="eligibleCubeKeys ? `${filteredStats.cubesWithMatch} cubes contain at least one matching card, out of ${filteredStats.cubeCount} cubes eligible under the active cube filters` : `${filteredStats.cubesWithMatch} cubes contain at least one matching card, out of ${filteredStats.cubeCount} loaded cubes`" placement="bottom" effect="light">
                        <span>{{ filteredStats.cubesWithMatch }} / {{ filteredStats.cubeCount }} Cubes</span>
                    </el-tooltip>
                </el-breadcrumb-item>
                <el-breadcrumb-item>
                    <el-tooltip :content="`Average matching cards per cube (among cubes with at least one match)`" placement="bottom" effect="light">
                        <span>avg {{ filteredStats.avgPerCube.toFixed(1) }} per cube</span>
                    </el-tooltip>
                </el-breadcrumb-item>
                <el-breadcrumb-item v-if="filteredStats.highlightedCubeCardCount !== null">
                    <el-tooltip :content="filteredStats.highlightedNormalizedAvg !== null ? `Total matching cards in the highlighted cube; normalized average shows expected count if other cubes were scaled to this cube's size` : `Total matching cards summed across all highlighted cubes`" placement="bottom" effect="light">
                        <span>{{ filteredStats.highlightedCubeCardCount }} highlighted<template v-if="filteredStats.highlightedNormalizedAvg !== null"> (avg {{ filteredStats.highlightedNormalizedAvg.toFixed(1) }})</template></span>
                    </el-tooltip>
                </el-breadcrumb-item>
            </el-breadcrumb>
            <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[25, 50, 100, 250]"
                :pager-count="5"
                layout="->, prev, pager, next, sizes"
                :total="filteredRows.length"
            />
        </template>
    </div>

    <el-row v-if="visualDisplayVisible && !isMobile" class="visual-sort-bar" align="middle">
        <el-space wrap>
            <span class="sort-label">Sort by</span>
            <el-select v-model="visualSortProp" size="small" style="width: 160px;" :disabled="!!querySortDirective">
                <el-option
                    v-for="opt in visualSortOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                />
            </el-select>
            <el-button size="small" @click="toggleVisualSortOrder" :disabled="!!querySortDirective">
                {{ visualSortOrder === 'ascending' ? '↑ Ascending' : '↓ Descending' }}
            </el-button>
            <el-divider direction="vertical" />
            <span class="sort-label">Columns</span>
            <el-input-number v-model="config.visualColumnCount" :min="1" :max="20" :step="1" size="small" style="width: 90px;" controls-position="right" />
        </el-space>
    </el-row>

    <div v-if="visualDisplayVisible" class="visual-card-grid" v-loading="!scryfallReady" :style="{ gridTemplateColumns: `repeat(${config.visualColumnCount}, 1fr)` }">
        <div v-if="scryfallReady && visibleRows.length === 0" class="visual-card-grid__empty">
            <template v-if="noCubesLoaded && !config.showAllCards">
                No cubes loaded. Load a cube to see card statistics, or show <el-link type="primary" @click="config.showAllCards = true"><strong>All Cards</strong></el-link> to browse without a loaded cube.
            </template>
            <template v-else>
                No matching cards found.
            </template>
        </div>
        <div
            v-for="card in visibleRows"
            :key="card.oracleId"
            class="visual-card-item"
            @click="openCardDetailDialog?.(card.oracleId)"
        >
            <el-image
                :src="card.urlFront"
                fit="contain"
                :alt="card.name"
                :class="['card-image', card.setCode?.toLowerCase(), { 'card-image--dimmed': highlightedOracleIds && !highlightedOracleIds.has(card.oracleId) }]"
                style="width: 100%; aspect-ratio: 63 / 88;"
            />
            <div
                class="visual-card-label" :class="{
                    'visual-card-label--highlighted': highlightedOracleIds && highlightedOracleIds.has(card.oracleId),
                    'visual-card-label--dimmed': highlightedOracleIds && !highlightedOracleIds.has(card.oracleId),
                }"
            >
                <el-text size="small" truncated>{{ card.name }}</el-text>
                <el-tag v-if="Object.keys(loadedCubes).length <= 1" type="info" size="small" style="margin-left: 6px;">
                    {{ card.globalRatePercent != null ? card.globalRatePercent.toFixed(1) + '%' : 'N/A' }}
                </el-tag>
                <el-tag v-else type="info" size="small" style="margin-left: 6px;">{{ card.cubeCount }}</el-tag>
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
        v-loading="!scryfallReady"
        stripe
    >
        <template v-if="!scryfallReady" #empty>
            Loading card data&hellip;
        </template>
        <template v-else-if="noCubesLoaded && !config.showAllCards" #empty>
            No cubes loaded. Load a cube to see card statistics, or show <el-link type="primary" @click="config.showAllCards = true"><strong>All Cards</strong></el-link> to browse without a loaded cube.
        </template>
        <template #cell-globalRate="{ row }">
            <template v-if="row.globalRateCount == null">N/A</template>
            <template v-else-if="!selectedFrequencyCubeCount">{{ row.globalRateCount.toLocaleString() }}</template>
            <template v-else>
                <el-text class="cell-primary">{{ ((row.globalRateCount / selectedFrequencyCubeCount) * 100).toFixed(1) }}%</el-text>
                <el-text class="cell-secondary">({{ row.globalRateCount.toLocaleString() }})</el-text>
            </template>
        </template>
        <template #cell-name="{ row }">
            <el-tooltip
                placement="right"
                effect="light"
                popper-class="card-tooltip"
                :show-after="50"
                :hide-after="50"
                :offset="16"
            >
                <template #content>
                    <el-image
                        :src="`${row.urlFront}`"
                        fit="contain"
                        :alt="row.name"
                        :class="'card-image ' + row.setCode?.toLowerCase()"
                    />
                </template>
                <span
                    class="name-cell-truncate"
                    :title="nameOverflowSet.has(row.oracleId) ? row.name : undefined"
                    @mouseenter="onNameMouseenter($event.currentTarget as HTMLElement, row.oracleId)"
                >
                    <el-link @click="openCardDetailDialog?.(row.oracleId)">{{ row.name }}</el-link>
                </span>
            </el-tooltip>
        </template>

        <template #cell-effectiveColors="{ row }">
            <span
                style="cursor: pointer;"
                :title="`Filter: color=${row.effectiveColors.join('')}`"
                @click="appendFilter(`color=${row.effectiveColors.join('')}`)"
            >
                <i
                    v-for="color in row.effectiveColors"
                    :key="color"
                    :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                    style="margin-right: 4px;"
                ></i>
            </span>
        </template>

        <template #cell-effectiveColorIdentity="{ row }">
            <span
                style="cursor: pointer;"
                :title="`Filter: id=${row.effectiveColorIdentity.join('')}`"
                @click="appendFilter(`id=${row.effectiveColorIdentity.join('')}`)"
            >
                <i
                    v-for="color in row.effectiveColorIdentity"
                    :key="color"
                    :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                    style="margin-right: 4px;"
                ></i>
            </span>
        </template>

        <template #cell-typeLine="{ row }">
            <el-tooltip
                :content="row.typeLine"
                placement="top-start"
                effect="light"
                :show-after="600"
                :disabled="!typeLineOverflowSet.has(row.oracleId)"
            >
                <span
                    class="type-line-words type-line-words--truncate"
                    @mouseenter="onTypeLineMouseenter($event.currentTarget as HTMLElement, row.oracleId)"
                >
                    <template v-for="(word, i) in row.typeLine.split(/\s+/)" :key="i">
                        <span v-if="word === '\u2014'">{{ word }}</span>
                        <span
                            v-else
                            style="cursor: pointer;"
                            class="clickable-filter-word"
                            :title="`Filter: type:${word}`"
                            @click.stop="appendFilter(`type:${word}`)"
                        >{{ word }}</span>
                    </template>
                </span>
            </el-tooltip>
        </template>

        <template #cell-cmc="{ row }">
            <span
                v-if="row.cmc != null"
                style="cursor: pointer;"
                class="clickable-filter-word"
                :title="`Filter: cmc=${row.cmc}`"
                @click="appendFilter(`cmc=${row.cmc}`)"
            >{{ row.cmc }}</span>
            <span v-else>&mdash;</span>
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

        <template #cell-setCode="{ row }">
            <span
                v-if="row.setCode"
                style="cursor: pointer;"
                class="clickable-filter-word"
                :title="`Filter: set:${row.setCode}`"
                @click="appendFilter(`set:${row.setCode}`)"
            >{{ row.setCode }}</span>
            <span v-else>&mdash;</span>
        </template>

        <template #cell-setType="{ row }">
            <span
                v-if="row.setType"
                style="cursor: pointer;"
                class="clickable-filter-word"
                :title="`Filter: settype:${row.setType}`"
                @click="appendFilter(`settype:${row.setType}`)"
            >{{ row.setType }}</span>
            <span v-else>&mdash;</span>
        </template>

        <template #cell-layout="{ row }">
            <span
                v-if="row.layout"
                style="cursor: pointer;"
                class="clickable-filter-word"
                :title="`Filter: layout:${row.layout}`"
                @click="appendFilter(`layout:${row.layout}`)"
            >{{ row.layout }}</span>
            <span v-else>&mdash;</span>
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

    <div v-if="isMobile" class="card-table-pagination-row">
        <el-button :disabled="currentPage <= 1" @click="currentPage--">Previous</el-button>
        <span class="mobile-page-info">{{ filteredRows.length }} / {{ sortedRows.length }} Cards</span>
        <el-button :disabled="currentPage >= totalPages" @click="currentPage++">Next</el-button>
    </div>
    <el-pagination
        v-else
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        :pager-count="5"
        layout="->, prev, pager, next, sizes"
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
                    @change="(v: boolean | string | number) => toggleGroupColumns(group.options, v as boolean)"
                ><strong>{{ group.label }}</strong></el-checkbox>
            </div>
            <el-checkbox-group v-model="config.visibleColumns" style="width: 100%;">
                <el-row :gutter="10">
                    <el-col :span="item.value === 'globalRate' ? 24 : 12" :xs="24" v-for="item in group.options" :key="item.value">
                        <template v-if="item.value === 'globalRate'">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <el-checkbox :value="item.value">
                                    {{ item.label }}
                                </el-checkbox>
                                <el-select
                                    v-if="frequencyCategoryOptions.length > 0"
                                    v-model="config.frequencyCategory"
                                    size="small"
                                    style="flex: 1; min-width: 120px; max-width: 200px;"
                                    placeholder="Global Rate"
                                >
                                    <el-option-group
                                        v-for="grp in groupedFrequencyOptions"
                                        :key="grp.label"
                                        :label="grp.label"
                                    >
                                        <el-option
                                            v-for="opt in grp.options"
                                            :key="opt.value"
                                            :label="opt.label"
                                            :value="opt.value"
                                        />
                                    </el-option-group>
                                </el-select>
                            </div>
                        </template>
                        <el-checkbox v-else :value="item.value">
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
import { ref, computed, inject, watch, reactive, useTemplateRef, nextTick } from 'vue';
import type { Ref } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { Menu, Grid, List } from '@element-plus/icons-vue';
import { bindStorage } from '../util/VueLocalStorage';
import { useBackDismiss } from '../util/useBackDismiss';
import { capitalizeFirstLetter, rarityOrder, getRarityColor, formatPrice } from '../util/HelperFunctions';
import StickyTable from './StickyTable.vue';
import type { StickyTableColumn } from '../types/StickyTableColumn';
import CardSearchInput from './filters/CardSearchInput.vue';
import TristateSelect from './filters/TristateSelect.vue';
import { parseQuery } from '../util/CardFilterParser';
import { evaluateCard, computeHighlightedOracleIds, collectHighlightCubeKeys, computeEligibleCubes, preResolveCubeKeys, extractSortDirective } from '../util/CardFilterEvaluator';
import { getSetReleaseDates, getScryfallCards, scryfallReady } from '../util/CubeFunctions';
import { getFrequencyCategoryOptions, resolveCardCount, resolveCubeCount, frequencyDataReady } from '../util/CubeCobraFrequency';
import { getCardStats, cardStatsReady } from '../util/CubeCobraCardStats';

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

const openCardDetailDialog = inject<(id: string) => void>('openCardDetailDialog');

const cardResultsTop = useTemplateRef<HTMLElement>('cardResultsTop');

const currentPage = ref(1);
const pageSize = ref(50);

watch(currentPage, () => {
    nextTick(() => {
        cardResultsTop.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});
const activeSort = ref<{ prop: string; order: 'ascending' | 'descending' | null } | null>({ prop: 'cubeCount', order: 'descending' });
const activeQuery = inject<Ref<string>>('cardTableQuery', ref(''));
const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value <= 760);

const activeCubeFilter = ref<Record<string, boolean | null>>({});
const activeCubeFilterMode = ref<'filter' | 'highlight'>('filter');

const cubeOptions = computed(() =>
    Object.entries(props.loadedCubes)
        .map(([key, cube]: [string, any]) => ({
            label: cube.name,
            value: key,
            searchTerms: [
                cube.name,
                key,
                cube.shortId,
                cube.id,
                cube.owner,
            ].filter(Boolean).map((s: string) => s.toLowerCase()),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
);

const columnCustomizationVisible = ref(false);
useBackDismiss(columnCustomizationVisible, () => { columnCustomizationVisible.value = false; });
const visualDisplayVisible = bindStorage('card-table-display-mode-visual', (v) => typeof v === 'boolean' ? v : isMobile.value);
const filtersExpanded = ref(false);

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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));

// --- Column visibility config ---
const defaultVisibleColumns = [
    'cubeCount', 'globalRate', 'effectiveColors', 'cmc', 'typeLine', 'tags',
    'minRarity', 'setCode', 'releaseDate', 'minPriceUsd',
];

const defaultVisualColumnCount = computed(() => isMobile.value ? 2 : 6);

const defaultConfig = {
    visibleColumns: [...defaultVisibleColumns],
    visualColumnCount: defaultVisualColumnCount.value,
    frequencyCategory: 'total',
    showAllCards: false,
};

const config = bindStorage('card-summary-table-config', (v) => {
    if (v == undefined || v === null) {
        return { ...defaultConfig, visualColumnCount: defaultVisualColumnCount.value };
    }
    return {
        visibleColumns: (Array.isArray(v.visibleColumns) ? v.visibleColumns : [...defaultVisibleColumns]) as string[],
        visualColumnCount: typeof v.visualColumnCount === 'number' ? v.visualColumnCount : defaultVisualColumnCount.value,
        frequencyCategory: typeof v.frequencyCategory === 'string' ? v.frequencyCategory : 'total',
        showAllCards: typeof v.showAllCards === 'boolean' ? v.showAllCards : false,
    };
});

const frequencyCategoryOptions = computed(() => {
    void frequencyDataReady.value; // reactive dependency
    return getFrequencyCategoryOptions();
});

const groupedFrequencyOptions = computed(() => {
    const opts = frequencyCategoryOptions.value;
    const ungrouped = opts.filter(o => !o.group);
    const groups = new Map<string, typeof opts>();
    for (const o of opts) {
        if (!o.group) continue;
        if (!groups.has(o.group)) groups.set(o.group, []);
        groups.get(o.group)!.push(o);
    }
    const result: { label: string; options: typeof opts }[] = [];
    if (ungrouped.length > 0) result.push({ label: 'General', options: ungrouped });
    for (const [label, options] of groups) result.push({ label, options });
    return result;
});

const selectedFrequencyLabel = computed(() => {
    const opt = frequencyCategoryOptions.value.find(o => o.value === config.value.frequencyCategory);
    return opt?.label ?? 'Global';
});

const selectedFrequencyCubeCount = computed(() => resolveCubeCount(config.value.frequencyCategory));

const noCubesLoaded = computed(() => Object.keys(props.loadedCubes).length === 0);

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
            { value: 'globalRate', label: 'Global Inclusion Rate' },
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
    { key: 'cubeCount', prop: 'cubeCount', label: 'Cubes', minWidth: '75px', align: 'center', sortable: true, visible: config.value.visibleColumns.includes('cubeCount') && !noCubesLoaded.value },
    { key: 'count', prop: 'count', label: 'Count', minWidth: '75px', align: 'center', sortable: true, tooltip: 'Total copies across all loaded cubes', visible: config.value.visibleColumns.includes('count') && !noCubesLoaded.value },
    { key: 'globalRate', prop: 'globalRatePercent', label: selectedFrequencyLabel.value, minWidth: '100px', align: 'center', sortable: true, tooltip: selectedFrequencyCubeCount.value
        ? `Inclusion rate across CubeCobra — ${selectedFrequencyLabel.value} (${selectedFrequencyCubeCount.value.toLocaleString()} cubes)`
        : `Inclusion count across CubeCobra (${selectedFrequencyLabel.value})`, visible: config.value.visibleColumns.includes('globalRate') },
    { key: 'effectiveColors', prop: 'effectiveColors', label: 'Colors', minWidth: '75px', align: 'center', tooltip: 'Actual card colors', visible: config.value.visibleColumns.includes('effectiveColors') },
    { key: 'effectiveColorIdentity', prop: 'effectiveColorIdentity', label: 'Color ID', minWidth: '75px', align: 'center', tooltip: 'Color Identity', visible: config.value.visibleColumns.includes('effectiveColorIdentity') },
    { key: 'cmc', prop: 'cmc', label: 'MV', minWidth: '60px', align: 'center', sortable: true, tooltip: 'Mana Value', visible: config.value.visibleColumns.includes('cmc') },
    { key: 'power', prop: 'power', label: 'Pow', minWidth: '55px', align: 'center', sortable: true, tooltip: 'Power', visible: config.value.visibleColumns.includes('power') },
    { key: 'toughness', prop: 'toughness', label: 'Tou', minWidth: '55px', align: 'center', sortable: true, tooltip: 'Toughness', visible: config.value.visibleColumns.includes('toughness') },
    { key: 'typeLine', prop: 'typeLine', label: 'Type', minWidth: '100px', maxWidth: '220px', showOverflowTooltip: true, sortable: true, tooltip: 'Type Line', visible: config.value.visibleColumns.includes('typeLine') },
    { key: 'elo', prop: 'elo', label: 'Elo', minWidth: '75px', align: 'center', sortable: true, formatter: (row: any) => row.elo != null ? row.elo.toFixed(0) : 'N/A', tooltip: 'CubeCobra Elo Rating', visible: config.value.visibleColumns.includes('elo') && (!noCubesLoaded.value || cardStatsReady.value) },
    { key: 'popularity', prop: 'popularity', label: 'Pop.', minWidth: '70px', align: 'center', sortable: true, formatter: (row: any) => row.popularity != null ? `${row.popularity.toFixed(2)} %` : 'N/A', tooltip: 'CubeCobra Popularity %', visible: config.value.visibleColumns.includes('popularity') && (!noCubesLoaded.value || cardStatsReady.value) },
    { key: 'tags', prop: 'tags', label: 'Tags', minWidth: '75px', visible: config.value.visibleColumns.includes('tags') },
    { key: 'minRarity', prop: 'minRarity', label: 'Min Rarity', minWidth: '75px', sortable: true, tooltip: 'Minimum rarity across all printings', visible: config.value.visibleColumns.includes('minRarity') },
    { key: 'setCode', prop: 'setCode', label: 'Set', minWidth: '60px', sortable: true, visible: config.value.visibleColumns.includes('setCode') },
    { key: 'setType', prop: 'setType', label: 'Set Type', minWidth: '90px', maxWidth: '130px', showOverflowTooltip: true, sortable: true, visible: config.value.visibleColumns.includes('setType') },
    { key: 'layout', prop: 'layout', label: 'Layout', minWidth: '75px', sortable: true, visible: config.value.visibleColumns.includes('layout') },
    { key: 'releaseDate', prop: 'releaseDate', label: 'Released', minWidth: '90px', sortable: true, tooltip: 'Release Date', visible: config.value.visibleColumns.includes('releaseDate') },
    { key: 'minPriceUsd', prop: 'minPriceUsd', label: 'Price (USD)', minWidth: '75px', sortable: true, formatter: (row: any) => row.minPriceUsd != null ? `$${formatPrice(row.minPriceUsd)}` : 'N/A', tooltip: 'Minimum price in USD across all printings', visible: config.value.visibleColumns.includes('minPriceUsd') },
    { key: 'minPriceTix', prop: 'minPriceTix', label: 'Price (Tix)', minWidth: '75px', sortable: true, formatter: (row: any) => row.minPriceTix != null ? formatPrice(row.minPriceTix) : 'N/A', tooltip: 'Minimum price in MTGO Tix across all printings', visible: config.value.visibleColumns.includes('minPriceTix') },
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

const appendFilter = (clause: string) => {
    const current = activeQuery.value.trim();
    activeQuery.value = current ? `${current} ${clause}` : clause;
};

const typeLineOverflowSet = reactive(new Set<string>());

const onTypeLineMouseenter = (el: HTMLElement, oracleId: string) => {
    if (el.scrollWidth > el.clientWidth) {
        typeLineOverflowSet.add(oracleId);
    } else {
        typeLineOverflowSet.delete(oracleId);
    }
};

const nameOverflowSet = reactive(new Set<string>());

const onNameMouseenter = (el: HTMLElement, oracleId: string) => {
    if (el.scrollWidth > el.clientWidth) {
        nameOverflowSet.add(oracleId);
    } else {
        nameOverflowSet.delete(oracleId);
    }
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

const querySortDirective = computed(() => extractSortDirective(parsedQuery.value.ast));

const highlightedOracleIds = computed<Set<string> | null>(() => {
    // Build the query-based highlight set (highlight: keyword in text query)
    const querySet = parsedQuery.value.ast
        ? computeHighlightedOracleIds(
            parsedQuery.value.ast,
            tableData.value,
            { loadedCubes: props.loadedCubes, setDates: getSetReleaseDates() },
        )
        : null;

    // Build the dropdown-based highlight set when mode is 'highlight'
    let dropdownSet: Set<string> | null = null;
    if (activeCubeFilterMode.value === 'highlight') {
        const includedKeys = Object.entries(activeCubeFilter.value)
            .filter(([, v]) => v === true)
            .map(([k]) => k);
        const excludedKeys = Object.entries(activeCubeFilter.value)
            .filter(([, v]) => v === false)
            .map(([k]) => k);
        if (includedKeys.length > 0 || excludedKeys.length > 0) {
            const includedKeySet = new Set(includedKeys);
            const excludedKeySet = new Set(excludedKeys);
            dropdownSet = new Set<string>();
            for (const row of tableData.value as any[]) {
                const rowCubes: string[] = row.cubes ?? [];
                const inIncluded = includedKeySet.size === 0 || rowCubes.some(c => includedKeySet.has(c));
                const notInExcluded = excludedKeySet.size === 0 || !rowCubes.some(c => excludedKeySet.has(c));
                if (inIncluded && notInExcluded) {
                    dropdownSet.add(row.oracleId);
                }
            }
        }
    }

    if (!querySet && !dropdownSet) return null;

    // Union both sets
    const result = new Set<string>(querySet ?? []);
    if (dropdownSet) dropdownSet.forEach(id => result.add(id));
    return result;
});

const rowClassFn = (row: any): string => {
    if (!highlightedOracleIds.value) return '';
    return highlightedOracleIds.value.has(row.oracleId) ? 'row--highlighted' : 'row--dimmed';
};

watch([activeQuery, activeCubeFilter, activeCubeFilterMode], () => {
    currentPage.value = 1;
});

watch(() => Object.keys(props.loadedCubes), (cubeKeys) => {
    const cubeKeySet = new Set(cubeKeys);
    const staleKeys = Object.keys(activeCubeFilter.value).filter(k => !cubeKeySet.has(k));
    if (staleKeys.length > 0) {
        const updated = { ...activeCubeFilter.value };
        for (const key of staleKeys) {
            delete updated[key];
        }
        activeCubeFilter.value = updated;
    }
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
        'Elo', 'Popularity', 'Type Line', 'Min Rarity',
        'Set Code', 'Set Type', 'Layout', 'Release Date',
        'Min Price (USD)', 'Min Price (Tix)',
        'Word Count', 'Word Count (No Reminder)',
        'Universes Beyond', 'Supplemental', 'Makes Tokens',
        `Global Rate (${selectedFrequencyLabel.value})`,
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
        row.globalRateCount ?? '',
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
    const allCards = Object.keys(props.loadedCubes).reduce((acc: Record<string, any>, key) => {
        props.loadedCubes[key].cards.forEach((card: any) => {
            if (acc[card.oracleId] === undefined) {
                acc[card.oracleId] = {
                    ...card,
                    isRemoval: card.tags.includes('removal'),
                    effectiveColors: (!card.colors || card.colors.length === 0) ? ['C'] : card.colors,
                    effectiveColorIdentity: (!card.colorIdentity || card.colorIdentity.length === 0) ? ['C'] : card.colorIdentity,
                    count: 0,
                    cubes: [],
                    cubeCount: 0,
                    globalRateCount: resolveCardCount(card.oracleId, config.value.frequencyCategory),
                    globalRatePercent: (() => {
                        const count = resolveCardCount(card.oracleId, config.value.frequencyCategory);
                        const total = resolveCubeCount(config.value.frequencyCategory);
                        if (count == null || !total) return null;
                        return (count / total) * 100;
                    })(),
                };
            }
            acc[card.oracleId].count += 1;
            if (!acc[card.oracleId].cubes.includes(key)) {
                acc[card.oracleId].cubes.push(key);
                acc[card.oracleId].cubeCount += 1;
            }
        });
        return acc;
    }, {} as Record<string, any>);

    if (config.value.showAllCards && scryfallReady.value) {
        const scryfallCards = getScryfallCards();
        for (const [oracleId, card] of Object.entries(scryfallCards)) {
            if (allCards[oracleId] !== undefined) continue;
            const effectiveColors = (!card.colors || card.colors.length === 0) ? ['C'] : card.colors;
            const effectiveColorIdentity = (!card.colorIdentity || card.colorIdentity.length === 0) ? ['C'] : card.colorIdentity;
            allCards[oracleId] = {
                ...card,
                oracleId,
                setCode: card.setCode?.toUpperCase() ?? '',
                isRemoval: card.tags.includes('removal'),
                effectiveColors,
                effectiveColorIdentity,
                count: 0,
                cubes: [],
                cubeCount: 0,
                elo: undefined,
                popularity: undefined,
                globalRateCount: resolveCardCount(oracleId, config.value.frequencyCategory),
                globalRatePercent: (() => {
                    const count = resolveCardCount(oracleId, config.value.frequencyCategory);
                    const total = resolveCubeCount(config.value.frequencyCategory);
                    if (count == null || !total) return null;
                    return (count / total) * 100;
                })(),
            };
        }
    }

    // Enrich with CubeCobra card stats where cube-sourced values are missing
    if (cardStatsReady.value) {
        for (const card of Object.values(allCards)) {
            if (card.elo == null || card.popularity == null) {
                const stats = getCardStats(card.oracleId);
                if (stats) {
                    if (card.elo == null) card.elo = stats.elo;
                    if (card.popularity == null) card.popularity = stats.popularity;
                }
            }
        }
    }

    return Object.values(allCards);
});

const sortedRows = computed(() => {
    const alphaSorted = tableData.value.slice(0).sort((a, b) => {
        if (a['name'] < b['name']) return -1;
        if (a['name'] > b['name']) return 1;
        return 0;
    });

    // Query-driven sort (order:) takes precedence over UI sort
    const sort = querySortDirective.value ?? activeSort.value;

    if (!sort || !sort.order) {
        return alphaSorted;
    }
    return alphaSorted.slice(0).sort((a, b) => {
        const sortKey = sort.prop;
        const dir = sort.order === 'ascending' ? 1 : -1;

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

        // Push null/undefined values to the end regardless of sort direction
        const aNull = a[sortKey] == null;
        const bNull = b[sortKey] == null;
        if (aNull && bNull) return a.name.localeCompare(b.name);
        if (aNull) return 1;
        if (bNull) return -1;

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

    if (hasCubeFilter && activeCubeFilterMode.value === 'filter') {
        rows = rows.filter(row => applyTristateFilter(activeCubeFilter.value, row.cubes));
    }

    if (hasTextQuery) {
        const ctx = { loadedCubes: props.loadedCubes, setDates: getSetReleaseDates(), resolvedCubeKeys: preResolveCubeKeys(parsedQuery.value.ast, { loadedCubes: props.loadedCubes }) };
        rows = rows.filter(row =>
            evaluateCard(parsedQuery.value.ast, row, ctx),
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

const eligibleCubeKeys = computed(() =>
    computeEligibleCubes(parsedQuery.value.ast, props.loadedCubes),
);

const filteredStats = computed(() => {
    const filteredOracleIds = new Set(filteredRows.value.map(row => row.oracleId));
    // Use eligible cubes as the denominator when cube-level filters are active,
    // otherwise fall back to all loaded cubes.
    const candidateKeys = eligibleCubeKeys.value
        ? [...eligibleCubeKeys.value]
        : Object.keys(props.loadedCubes);
    const cubeMatchCounts: Record<string, number> = {};
    for (const key of candidateKeys) {
        cubeMatchCounts[key] = props.loadedCubes[key].cards.filter((c: any) => filteredOracleIds.has(c.oracleId)).length;
    }
    const counts = Object.values(cubeMatchCounts);
    const cubeCount = candidateKeys.length;
    const cubesWithMatch = counts.filter(c => c > 0).length;
    const matchingCounts = counts.filter(c => c > 0);
    const avgPerCube = matchingCounts.length > 0 ? matchingCounts.reduce((a: number, b: number) => a + b, 0) / matchingCounts.length : 0;

    const highlightedKeys = activeCubeFilterMode.value === 'highlight'
        ? Object.entries(activeCubeFilter.value).filter(([, v]) => v === true).map(([k]) => k)
        : [];
    const negativeHighlightedKeys = activeCubeFilterMode.value === 'highlight'
        ? Object.entries(activeCubeFilter.value).filter(([, v]) => v === false).map(([k]) => k)
        : [];

    // Also collect highlight cube keys from the text query
    if (parsedQuery.value.ast) {
        const ctx = { loadedCubes: props.loadedCubes, setDates: getSetReleaseDates() };
        const { positive, negative } = collectHighlightCubeKeys(parsedQuery.value.ast, ctx);
        for (const k of positive) {
            if (!highlightedKeys.includes(k)) highlightedKeys.push(k);
        }
        for (const k of negative) {
            if (!negativeHighlightedKeys.includes(k)) negativeHighlightedKeys.push(k);
        }
    }

    let highlightedCubeCardCount: number | null = null;
    let highlightedNormalizedAvg: number | null = null;

    if (highlightedKeys.length > 0 || negativeHighlightedKeys.length > 0) {
        // Count matching cards in positive cubes
        const positiveCount = highlightedKeys.reduce((sum: number, key: string) => sum + (cubeMatchCounts[key] ?? 0), 0);

        if (negativeHighlightedKeys.length > 0 && highlightedKeys.length > 0) {
            // Subtract cards that are in the intersection (in both positive and negative cubes)
            const positiveOracleIds = new Set<string>();
            for (const key of highlightedKeys) {
                if (!props.loadedCubes[key]) continue;
                for (const c of props.loadedCubes[key].cards) {
                    if (filteredOracleIds.has(c.oracleId)) positiveOracleIds.add(c.oracleId);
                }
            }
            let intersectionCount = 0;
            for (const key of negativeHighlightedKeys) {
                if (!props.loadedCubes[key]) continue;
                for (const c of props.loadedCubes[key].cards) {
                    if (positiveOracleIds.has(c.oracleId)) {
                        intersectionCount++;
                        positiveOracleIds.delete(c.oracleId); // count each card only once
                    }
                }
            }
            highlightedCubeCardCount = positiveCount - intersectionCount;
        } else if (highlightedKeys.length > 0) {
            highlightedCubeCardCount = positiveCount;
        } else {
            // Only negative highlights — show the count from those cubes
            highlightedCubeCardCount = negativeHighlightedKeys.reduce((sum: number, key: string) => sum + (cubeMatchCounts[key] ?? 0), 0);
        }

        // Normalized average: only when exactly 1 net positive cube is highlighted
        const netPositiveKeys = highlightedKeys.filter(k => !negativeHighlightedKeys.includes(k));
        if (netPositiveKeys.length === 1) {
            const hlKey = netPositiveKeys[0];
            const hlCubeSize = props.loadedCubes[hlKey]?.cards?.length ?? 0;
            if (hlCubeSize > 0 && matchingCounts.length > 0) {
                let normalizedSum = 0;
                let normalizedCount = 0;
                for (const key of candidateKeys) {
                    if (cubeMatchCounts[key] === 0) continue;
                    const cubeSize = props.loadedCubes[key]?.cards?.length ?? 0;
                    if (cubeSize === 0) continue;
                    normalizedSum += cubeMatchCounts[key] * (hlCubeSize / cubeSize);
                    normalizedCount++;
                }
                highlightedNormalizedAvg = normalizedCount > 0 ? normalizedSum / normalizedCount : null;
            }
        }
    }

    return { cubesWithMatch, avgPerCube, cubeCount, highlightedCubeCardCount, highlightedNormalizedAvg };
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

.card-table-toolbar-secondary {
    display: contents;
}

.card-table-filter-toggle {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    padding: 4px 16px;
    border-radius: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
}

.card-table-filter-toggle:hover {
    background: var(--el-fill-color);
}

.card-table-mobile-filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;

    .sort-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
    }

    .mobile-filter-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }
}

.card-table-pagination-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0;

    .el-pagination {
        flex: 1;
        margin: 8px 0;
    }

    .mobile-page-info {
        flex: 1;
        text-align: center;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
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
    gap: 12px;
}

.visual-card-grid__empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px 16px;
    color: var(--el-text-color-secondary);

    .el-link {
        vertical-align: top;
    }
}

.visual-card-item {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    min-width: 0;

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
    border-radius: var(--el-border-radius-base);
    padding: 2px 4px;
    box-sizing: border-box;
}

.visual-card-label--highlighted {
    background-color: rgba(103, 194, 58, 0.25);
}

.visual-card-label--dimmed {
    opacity: 0.4;
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

.clickable-filter-word {
    border-radius: 2px;
    padding: 0 1px;
    transition: background-color 0.15s;

    &:hover {
        background-color: var(--el-fill-color);
    }
}

.name-cell-truncate {
    display: block;
    width: fit-content;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.type-line-words {
    display: inline-flex;
    gap: 0.3em;
    flex-wrap: wrap;
    align-items: baseline;

    &.type-line-words--truncate {
        display: flex;
        width: 100%;
        flex-wrap: nowrap;
        overflow: hidden;
        mask-image: linear-gradient(to right, black 80%, transparent 100%);
    }
}

.row-rarities {
    margin-top: 10px;
    text-align: center;

    .el-text {
        line-height: 1.5em;
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

.all-cards-dropdown {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.all-cards-dropdown__toggle {
    padding-bottom: 4px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: 2px;
}

.all-cards-dropdown__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

// ── Highlight / dim styles ──────────────────────────────────────────────────

.sticky-table__row.row--highlighted {
    background-color: rgba(103, 194, 58, 0.12);
    box-shadow: inset 3px 0 0 var(--el-color-success);
}

.sticky-table__row.row--dimmed {
    opacity: 0.5;
}

.card-image--dimmed {
    opacity: 0.4;
}
</style>
