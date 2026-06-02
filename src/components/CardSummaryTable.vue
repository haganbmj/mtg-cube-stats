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

        <el-button-group v-show="!isMobile">
            <el-button :icon="Grid" :type="visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = true" title="Visual Display" />
            <el-button :icon="List" :type="!visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = false" title="Table Display" />
        </el-button-group>
        <el-dropdown trigger="click">
            <el-button :icon="Menu" circle />
            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item @click="columnCustomizationVisible = true">Customize Columns</el-dropdown-item>
                    <el-dropdown-item @click="exportToCsv">Export as CSV</el-dropdown-item>
                    <el-dropdown-item divided @click="showAllCards = !showAllCards">Show All Cards{{ showAllCards ? ' ✓' : '' }}</el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>

    <div ref="cardResultsTop" class="card-table-sort-row">
        <template v-if="isMobile">
            <el-button :disabled="currentPage <= 1" @click="currentPage--">Previous</el-button>
            <span class="card-table-filter-toggle" @click="viewExpanded = !viewExpanded">
                {{ viewExpanded ? '▴ Options' : '▾ Options' }}
            </span>
            <el-button :disabled="currentPage >= totalPages" @click="currentPage++">Next</el-button>
        </template>
        <template v-else>
            <div class="card-table-sort-controls">
                <el-select v-model="showAllCardsValue" style="width: 180px;">
                    <el-option label="Only in Loaded Cubes" value="off" />
                    <el-option label="All Cards" value="on" />
                </el-select>
                <label class="sort-label">Sorted by</label>
                <el-select v-model="sortProp" style="width: 150px;" :disabled="!!querySortDirective?.hasOrder">
                    <el-option
                        v-for="opt in cardSortProperties"
                        :key="opt.prop"
                        :label="opt.label"
                        :value="opt.prop"
                    />
                </el-select>
                <el-select v-model="sortDirection" style="width: 80px;" :disabled="!!querySortDirective?.hasDirection">
                    <el-option label="Auto" value="auto" />
                    <el-option label="Asc" value="ascending" />
                    <el-option label="Desc" value="descending" />
                </el-select>
                <template v-if="visualDisplayVisible">
                    <label class="sort-label">Columns</label>
                    <el-input-number v-model="config.visualColumnCount" :min="1" :max="20" :step="1" style="width: 90px;" controls-position="right" />
                </template>
            </div>
            <el-pagination
                v-model:current-page="currentPage"
                :pager-count="5"
                layout="prev, pager, next"
                :total="filteredRows.length"
                :page-size="pageSize"
            />
        </template>
    </div>

    <div v-if="isMobile && viewExpanded" class="card-table-mobile-filters">
        <div v-if="Object.keys(loadedCubes).length > 0" class="mobile-filter-row">
            <span class="mobile-filter-label">Cubes</span>
            <div class="mobile-filter-control">
                <TristateSelect
                    :modelValue="activeCubeFilter"
                    @update:modelValue="activeCubeFilter = $event"
                    :options="cubeOptions"
                    :showModeToggle="true"
                    :mode="activeCubeFilterMode"
                    @update:mode="activeCubeFilterMode = $event"
                    placeholder="Filter by cube..."
                />
            </div>
        </div>
        <div class="mobile-filter-row">
            <span class="mobile-filter-label">All Cards</span>
            <el-select v-model="showAllCardsValue" size="small" class="mobile-filter-control">
                <el-option label="Only in Loaded Cubes" value="off" />
                <el-option label="All Cards" value="on" />
            </el-select>
        </div>

        <div class="mobile-filter-row">
            <span class="mobile-filter-label">Display</span>
            <el-select v-model="displayModeValue" size="small" class="mobile-filter-control">
                <el-option label="Images" value="grid" />
                <el-option label="Table" value="table" />
            </el-select>
        </div>
        <div class="mobile-filter-row">
            <span class="mobile-filter-label">Sorted by</span>
            <el-select v-model="sortProp" size="small" class="mobile-filter-control" :disabled="!!querySortDirective?.hasOrder">
                <el-option
                    v-for="opt in cardSortProperties"
                    :key="opt.prop"
                    :label="opt.label"
                    :value="opt.prop"
                />
            </el-select>
        </div>
        <div class="mobile-filter-row">
            <span class="mobile-filter-label">Sort direction</span>
            <el-select v-model="sortDirection" size="small" class="mobile-filter-control" :disabled="!!querySortDirective?.hasDirection">
                <el-option label="Auto" value="auto" />
                <el-option label="Asc" value="ascending" />
                <el-option label="Desc" value="descending" />
            </el-select>
        </div>
        <div v-if="visualDisplayVisible" class="mobile-filter-row">
            <span class="mobile-filter-label">Columns</span>
            <el-input-number v-model="config.visualColumnCount" :min="1" :max="20" :step="1" size="small" class="mobile-filter-control" controls-position="right" />
        </div>
    </div>

    <div v-if="isMobile" class="card-table-card-count">
        <span>{{ filteredRows.length }} / {{ sortedRows.length }} Cards</span>
    </div>

    <div v-if="!isMobile" class="card-table-filter-summary">
        <el-breadcrumb separator="·" class="filter-summary">
            <el-breadcrumb-item>
                <el-tooltip :content="showAllCards ? `${filteredRows.length} unique cards match the active filters out of ${sortedRows.length} total cards in the Scryfall database` : `${filteredRows.length} unique cards match the active filters out of ${sortedRows.length} total unique cards across all loaded cubes`" placement="bottom" effect="light" :enterable="false" >
                    <span>{{ filteredRows.length }} / {{ sortedRows.length }} Cards</span>
                </el-tooltip>
            </el-breadcrumb-item>
            <el-breadcrumb-item>
                <el-tooltip :content="eligibleCubeKeys ? `${filteredStats.cubesWithMatch} cubes contain at least one matching card, out of ${filteredStats.cubeCount} cubes eligible under the active cube filters` : `${filteredStats.cubesWithMatch} cubes contain at least one matching card, out of ${filteredStats.cubeCount} loaded cubes`" placement="bottom" effect="light" :enterable="false" >
                    <span>{{ filteredStats.cubesWithMatch }} / {{ filteredStats.cubeCount }} Cubes</span>
                </el-tooltip>
            </el-breadcrumb-item>
            <el-breadcrumb-item>
                <el-tooltip :content="`Average matching cards per cube (among cubes with at least one match)`" placement="bottom" effect="light" :enterable="false">
                    <span>avg {{ filteredStats.avgPerCube.toFixed(1) }} per cube</span>
                </el-tooltip>
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="filteredStats.highlightedCubeCardCount !== null">
                <el-tooltip :content="filteredStats.highlightedNormalizedAvg !== null ? `Total matching cards in the highlighted cube; normalized average shows expected count if other cubes were scaled to this cube's size` : `Total matching cards summed across all highlighted cubes`" placement="bottom" effect="light" :enterable="false">
                    <span>{{ filteredStats.highlightedCubeCardCount }} highlighted<template v-if="filteredStats.highlightedNormalizedAvg !== null"> (avg {{ filteredStats.highlightedNormalizedAvg.toFixed(1) }})</template></span>
                </el-tooltip>
            </el-breadcrumb-item>
        </el-breadcrumb>
    </div>

    <div v-if="visualDisplayVisible" class="visual-card-grid" v-loading="!scryfallReady" :style="{ gridTemplateColumns: `repeat(${config.visualColumnCount}, 1fr)` }">
        <div v-if="scryfallReady && visibleRows.length === 0" class="visual-card-grid__empty">
            <template v-if="noCubesLoaded && !showAllCards">
                No cubes loaded. Load a cube to see card statistics, or show <el-link type="primary" @click="showAllCards = true"><strong>All Cards</strong></el-link> to browse without a loaded cube.
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
                <!-- <el-text size="small" truncated>{{ card.name }}</el-text> -->
                <el-tag type="info" size="small" style="margin-left: 6px;">{{ getVisualCardTag(card).label }}: {{ getVisualCardTag(card).value }}</el-tag>
            </div>
        </div>
    </div>

    <StickyTable
        v-else
        :data="visibleRows"
        :columns="tableColumns"
        :sortProp="resolvedSortProp"
        :sortOrder="resolvedSortDirection"
        :rowClassFn="rowClassFn"
        v-loading="!scryfallReady"
        stripe
        @sort-change="handleTableSortChange"
    >
        <template v-if="!scryfallReady" #empty>
            Loading card data&hellip;
        </template>
        <template v-else-if="noCubesLoaded && !showAllCards" #empty>
            No cubes loaded. Load a cube to see card statistics, or show <el-link type="primary" @click="showAllCards = true"><strong>All Cards</strong></el-link> to browse without a loaded cube.
        </template>
        <template #cell-name="{ row }">
            <el-tooltip
                placement="right"
                effect="light"
                popper-class="card-tooltip"
                :show-after="50"
                :hide-after="50"
                :enterable="false"
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
                :enterable="false"
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
                    :class="{ 'custom-color-tag': getTagColor(tag) }"
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
                :class="{ 'custom-color-tag': getRarityColor(row.minRarity) }"
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
                    :class="{ 'custom-color-tag': getGameTagColor(game) }"
                    :color="getGameTagColor(game)"
                    disable-transitions
                >
                    {{ game }}
                </el-tag>
            </div>
        </template>
    </StickyTable>

    <div v-if="isMobile && filteredRows.length > pageSize" class="card-table-pagination-row">
        <el-button :disabled="currentPage <= 1" @click="currentPage--">Previous</el-button>
        <span class="card-table-filter-toggle" @click="viewExpanded = !viewExpanded">
            {{ viewExpanded ? '▴ View' : '▾ View' }}
        </span>
        <el-button :disabled="currentPage >= totalPages" @click="currentPage++">Next</el-button>
    </div>
    <el-pagination
        v-else-if="!isMobile && filteredRows.length > pageSize"
        class="card-table-bottom-pagination"
        v-model:current-page="currentPage"
        :pager-count="5"
        layout="->, prev, pager, next"
        :total="filteredRows.length"
        :page-size="pageSize"
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
                    <el-col :span="12" :xs="24" v-for="item in group.options" :key="item.value">
                        <el-checkbox :value="item.value">
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
import { capitalizeFirstLetter, rarityOrder, getRarityColor, formatPrice, normalizeSortName, castInensitiveSort } from '../util/HelperFunctions';
import { colorComboSortKey } from '../util/CardGrouping';
import { cardSortProperties, resolveDirection, stripSortTokens } from '../util/SortConfig';
import type { SortDirection } from '../util/SortConfig';
import StickyTable from './StickyTable.vue';
import type { StickyTableColumn } from '../types/StickyTableColumn';
import CardSearchInput from './filters/CardSearchInput.vue';
import TristateSelect from './filters/TristateSelect.vue';
import { parseQuery } from '../util/CardFilterParser';
import { evaluateCard, computeHighlightedOracleIds, collectHighlightCubeKeys, computeEligibleCubes, preResolveCubeKeys, extractSortDirective } from '../util/CardFilterEvaluator';
import { getSetReleaseDates, getScryfallCards, scryfallReady } from '../util/CubeFunctions';
import { resolveCubeCount, FREQUENCY_COLUMNS, resolveAllRates } from '../util/CubeCobraFrequency';
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
const showAllCards = inject<Ref<boolean>>('showAllCards', ref(false));

const cardResultsTop = useTemplateRef<HTMLElement>('cardResultsTop');

const currentPage = ref(1);
const pageSize = computed(() => {
    if (!visualDisplayVisible.value) return 50;
    const cols = config.value.visualColumnCount;
    const target = Math.max(60, cols * 10);
    return Math.ceil(target / cols) * cols;
});

watch(currentPage, () => {
    nextTick(() => {
        cardResultsTop.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});
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
const visualDisplayVisible = bindStorage('card-table-display-mode-visual', (v) => typeof v === 'boolean' ? v : true);
const viewExpanded = ref(false);

const sortProp = inject<Ref<string>>('cardSortProp', ref('cubeCount'));
const sortDirection = inject<Ref<SortDirection>>('cardSortDirection', ref('auto'));

watch(sortProp, (_newVal, oldVal) => {
    if (oldVal !== undefined && querySortDirective.value) {
        activeQuery.value = stripSortTokens(activeQuery.value);
    }
    sortDirection.value = 'auto';
    currentPage.value = 1;
});

watch(sortDirection, (newVal, oldVal) => {
    if (oldVal !== undefined && newVal !== 'auto' && querySortDirective.value) {
        activeQuery.value = stripSortTokens(activeQuery.value);
    }
});

const resolvedSortDirection = computed(() => {
    if (querySortDirective.value?.hasDirection) {
        return querySortDirective.value.order;
    }
    return resolveDirection(sortDirection.value, sortProp.value, cardSortProperties);
});

const resolvedSortProp = computed(() => {
    if (querySortDirective.value?.hasOrder) {
        return querySortDirective.value.prop;
    }
    return sortProp.value;
});

function handleTableSortChange(payload: { prop: string; order: 'ascending' | 'descending' }) {
    if (querySortDirective.value) {
        activeQuery.value = stripSortTokens(activeQuery.value);
    }
    sortProp.value = payload.prop;
    sortDirection.value = payload.order;
}

const derivableFromImageSorts = new Set(['name', 'cmc', 'releaseDate', 'minRarity', 'power', 'toughness']);

function getVisualCardTag(card: any): { label: string; value: string } {
    const prop = resolvedSortProp.value;

    if (derivableFromImageSorts.has(prop)) {
        if (Object.keys(props.loadedCubes).length <= 1) {
            return { label: 'Global Rate', value: card.globalRatePercent_total != null ? card.globalRatePercent_total.toFixed(1) + '%' : 'N/A' };
        }
        return { label: 'Cube Count', value: String(card.cubeCount ?? 'N/A') };
    }

    switch (prop) {
        case 'cubeCount':
            return { label: 'Cube Count', value: String(card.cubeCount ?? 'N/A') };
        case 'globalRatePercent_total':
            return { label: 'Global Rate', value: card.globalRatePercent_total != null ? card.globalRatePercent_total.toFixed(1) + '%' : 'N/A' };
        case 'globalRatePercent_broad_pauper':
            return { label: 'Global Rate (Pauper)', value: card.globalRatePercent_broad_pauper != null ? card.globalRatePercent_broad_pauper.toFixed(1) + '%' : 'N/A' };
        case 'globalRatePercent_broad_peasant':
            return { label: 'Global Rate (Peasant)', value: card.globalRatePercent_broad_peasant != null ? card.globalRatePercent_broad_peasant.toFixed(1) + '%' : 'N/A' };
        case 'elo':
            return { label: 'Elo', value: card.elo != null ? String(Math.round(card.elo)) : 'N/A' };
        case 'popularity':
            return { label: 'Popularity', value: card.popularity != null ? card.popularity.toFixed(1) + '%' : 'N/A' };
        case 'minPriceUsd':
            return { label: 'Price', value: card.minPriceUsd != null ? '$' + Number(card.minPriceUsd).toFixed(2) : 'N/A' };
        case 'minPriceTix':
            return { label: 'Price', value: card.minPriceTix != null ? Number(card.minPriceTix).toFixed(1) + ' Tix' : 'N/A' };
        case 'oracleTextWordCountMinusParen':
            return { label: 'Word Count', value: card.oracleTextWordCountMinusParen != null ? String(card.oracleTextWordCountMinusParen) : 'N/A' };
        default:
            if (Object.keys(props.loadedCubes).length <= 1) {
                return { label: 'Global Rate', value: card.globalRatePercent_total != null ? card.globalRatePercent_total.toFixed(1) + '%' : 'N/A' };
            }
            return { label: 'Cube Count', value: String(card.cubeCount ?? 'N/A') };
    }
}

const displayModeValue = computed({
    get: () => visualDisplayVisible.value ? 'grid' : 'table',
    set: (val: string) => { visualDisplayVisible.value = val === 'grid'; },
});

const showAllCardsValue = computed({
    get: () => showAllCards.value ? 'on' : 'off',
    set: (val: string) => { showAllCards.value = val === 'on'; },
});

watch(visualDisplayVisible, () => {
    currentPage.value = 1;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));

// --- Column visibility config ---
const defaultVisibleColumns = [
    'cubeCount', 'globalRate_total', 'effectiveColors', 'cmc', 'typeLine', 'tags',
    'minRarity', 'setCode', 'releaseDate', 'minPriceUsd',
];

const defaultVisualColumnCount = computed(() => isMobile.value ? 2 : 6);

const defaultConfig = {
    visibleColumns: [...defaultVisibleColumns],
    visualColumnCount: defaultVisualColumnCount.value,
};

const config = bindStorage('card-summary-table-config', (v) => {
    if (v == undefined || v === null) {
        return { ...defaultConfig, visualColumnCount: defaultVisualColumnCount.value };
    }
    let cols = (Array.isArray(v.visibleColumns) ? v.visibleColumns : [...defaultVisibleColumns]) as string[];
    // Migrate legacy single globalRate column to new split columns
    if (cols.includes('globalRate')) {
        cols = cols.filter(c => c !== 'globalRate');
        cols.push('globalRate_total');
    }
    return {
        visibleColumns: cols,
        visualColumnCount: typeof v.visualColumnCount === 'number' ? v.visualColumnCount : defaultVisualColumnCount.value,
    };
});

watch(() => config.value.visualColumnCount, () => {
    currentPage.value = 1;
});

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
        label: 'Global Rates',
        options: FREQUENCY_COLUMNS.map(col => ({
            value: col.columnKey,
            label: col.label,
        })),
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
    ...FREQUENCY_COLUMNS.map(col => ({
        key: col.columnKey,
        prop: col.propKey,
        label: col.label,
        minWidth: '90px',
        align: 'center' as const,
        sortable: true,
        tooltip: `CubeCobra inclusion rate — ${col.label} (${resolveCubeCount(col.categoryValue)?.toLocaleString() ?? '?'} cubes)`,
        visible: config.value.visibleColumns.includes(col.columnKey),
        formatter: (row: any) => row[col.propKey] != null ? `${row[col.propKey].toFixed(1)}%` : 'N/A',
    })),
    { key: 'effectiveColors', prop: 'effectiveColors', label: 'Colors', minWidth: '75px', align: 'center', sortable: true, tooltip: 'Actual card colors', visible: config.value.visibleColumns.includes('effectiveColors') },
    { key: 'effectiveColorIdentity', prop: 'effectiveColorIdentity', label: 'Color ID', minWidth: '75px', align: 'center', sortable: true, tooltip: 'Color Identity', visible: config.value.visibleColumns.includes('effectiveColorIdentity') },
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

// --- Tag / game display helpers ---
const tagsMeta = [
    { value: 'counterspell', color: '#1a6e9e' },
    { value: 'draw', color: '#1c5fb8' },
    { value: 'flicker', color: '#b36b00' },
    { value: 'ramp', color: '#2e7d4f' },
    { value: 'removal', color: '#b33a2a' },
    { value: 'token', color: '#8a6d00' },
    { value: 'tutor', color: '#5c3d99' },
];

const gamesMeta = [
    { value: 'paper', color: '#1e6b1e' },
    { value: 'mtgo', color: '#3a6d8c' },
    { value: 'arena', color: '#7a3d78' },
];

const filteredTags = (cardTags: string[]) => {
    return cardTags.filter(tag => tagsMeta.some(t => t.value.toLowerCase() === tag.toLowerCase()));
};

const getTagColor = (tag: string) => {
    return tagsMeta.find(t => t.value.toLowerCase() === tag.toLowerCase())?.color;
};

const getGameTagColor = (game: string) => {
    return gamesMeta.find(g => g.value.toLowerCase() === game.toLowerCase())?.color;
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

    const visibleRateColumns = FREQUENCY_COLUMNS.filter(col => config.value.visibleColumns.includes(col.columnKey));

    const headers = [
        'Index', 'Name', 'Cubes', 'Total Count', 'Colors', 'Color Identity', 'Mana Value',
        'Elo', 'Popularity', 'Type Line', 'Min Rarity',
        'Set Code', 'Set Type', 'Layout', 'Release Date',
        'Min Price (USD)', 'Min Price (Tix)',
        'Word Count', 'Word Count (No Reminder)',
        'Universes Beyond', 'Supplemental', 'Makes Tokens',
        ...visibleRateColumns.map(col => `Global Rate (${col.label})`),
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
        ...visibleRateColumns.map(col => row[col.propKey] != null ? `${row[col.propKey].toFixed(1)}%` : ''),
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
                    ...resolveAllRates(card.oracleId),
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

    if (showAllCards.value && scryfallReady.value) {
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
                ...resolveAllRates(oracleId),
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
    const alphaSorted = tableData.value.slice(0).sort((a, b) =>
        castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name)),
    );

    const prop = resolvedSortProp.value;
    const dir = resolvedSortDirection.value === 'ascending' ? 1 : -1;

    return alphaSorted.slice(0).sort((a, b) => {
        const sortKey = prop;

        // Rarity sorting with defined ordering
        if (sortKey === 'minRarity') {
            const aVal = rarityOrder[a.minRarity] ?? -1;
            const bVal = rarityOrder[b.minRarity] ?? -1;
            if (aVal !== bVal) return (aVal - bVal) * dir;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // Power/toughness: parse numerically, non-numeric values sort last
        if (sortKey === 'power' || sortKey === 'toughness') {
            const aVal = parseFloat(a[sortKey]);
            const bVal = parseFloat(b[sortKey]);
            const aNum = isNaN(aVal) ? -1 : aVal;
            const bNum = isNaN(bVal) ? -1 : bVal;
            if (aNum !== bNum) return (aNum - bNum) * dir;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // Color sorting using Magic's color pie order
        if (sortKey === 'effectiveColors' || sortKey === 'effectiveColorIdentity') {
            const aVal = colorComboSortKey(a[sortKey] ?? []);
            const bVal = colorComboSortKey(b[sortKey] ?? []);
            if (aVal !== bVal) return (aVal - bVal) * dir;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // String-based sorts: typeLine, setCode, setType, layout
        if (['typeLine', 'setCode', 'setType', 'layout'].includes(sortKey)) {
            const aVal = a[sortKey] ?? '';
            const bVal = b[sortKey] ?? '';
            const cmp = castInensitiveSort(String(aVal), String(bVal)) * dir;
            if (cmp !== 0) return cmp;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // Push null/undefined values to the end regardless of sort direction
        const aNull = a[sortKey] == null;
        const bNull = b[sortKey] == null;
        if (aNull && bNull) return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        if (aNull) return 1;
        if (bNull) return -1;

        if (a[sortKey] < b[sortKey]) return -1 * dir;
        if (a[sortKey] > b[sortKey]) return 1 * dir;
        return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
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
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
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

    .mobile-filter-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        width: 35%;
        flex-shrink: 0;
        text-align: right;
    }

    .mobile-filter-control {
        width: 50%;
        flex-shrink: 0;
    }

    .mobile-filter-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }
}

.card-table-sort-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 8px 0;
}

.card-table-card-count {
    text-align: center;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin: 16px 0;
}

.card-table-sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.sort-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
    white-space: nowrap;

    margin-left: 8px;
}

.card-table-filter-summary {
    margin: 16px 0;
}

.card-table-pagination-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 16px 0;
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

.card-table-bottom-pagination {
    margin: 16px 0;
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

.custom-color-tag {
    color: #fff !important;
    border-color: transparent !important;
}
</style>
