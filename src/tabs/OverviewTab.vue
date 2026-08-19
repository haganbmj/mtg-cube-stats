<template>
    <ColumnCustomizer
        v-model="columnCustomizationVisible"
        v-model:column-order="config.columnOrder"
        v-model:visible-columns="config.visibleColumns"
        :column-meta="columnMeta"
        :default-column-order="defaultColumnOrder"
        :default-visible-columns="defaultConfig.visibleColumns"
    >
        <template #toggles>
            <el-checkbox v-model="config.peerComparisons">
                Peer Comparison Indicators
                <el-tooltip
                    content="Show ▲/▼ indicators on stat values that are notably higher or lower than other loaded cubes (±1 standard deviation)"
                    placement="top"
                    :hide-after="50"
                >
                    <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
            </el-checkbox>
        </template>
    </ColumnCustomizer>

    <el-dialog
        v-model="bulkEntryVisible"
        title="Bulk Entry"
        width="500"
        align-center
        destroy-on-close
        @open="handleBulkEntryOpen"
    >
        <el-input
            v-model="bulkEntryText"
            type="textarea"
            :rows="12"
            placeholder="Enter cube IDs, one per line"
        />
        <template #footer>
            <el-button @click="bulkEntryVisible = false">Cancel</el-button>
            <el-button type="primary" @click="handleBulkEntrySubmit">Submit</el-button>
        </template>
    </el-dialog>

    <el-dialog
        v-model="saveDialogVisible"
        title="Save Collection"
        width="400"
        align-center
        destroy-on-close
    >
        <el-input
            v-model="saveDialogName"
            placeholder="Collection name"
            maxlength="60"
            show-word-limit
            @keyup.enter="handleSaveCollection"
        />
        <template #footer>
            <el-button @click="saveDialogVisible = false">Cancel</el-button>
            <el-button type="primary" :disabled="!saveDialogName.trim()" @click="handleSaveCollection">Save</el-button>
        </template>
    </el-dialog>

    <el-dialog
        v-model="removeDialogVisible"
        title="Remove Collection"
        width="400"
        align-center
        destroy-on-close
    >
        <el-empty v-if="props.userCollections.length === 0" description="No saved collections" :image-size="60" />
        <ul v-else class="collection-remove-list">
            <li v-for="col in props.userCollections" :key="col.name" class="collection-remove-item">
                <span>{{ col.name }}</span>
                <el-button link type="danger" @click="handleRemoveCollection(col.name)">
                    <el-icon><Delete /></el-icon>
                </el-button>
            </li>
        </ul>
        <template #footer>
            <el-button @click="removeDialogVisible = false">Close</el-button>
        </template>
    </el-dialog>

    <div
        class="overview-loading-container"
        v-loading="isLoading"
        :element-loading-text="loadingText"
        element-loading-custom-class="overview-loading"
    >
        <PresetHeader :preset="props.activePreset" />
        <div class="overview-toolbar-row-1">
            <div class="overview-search-input">
                <CubeSearchInput v-model="cubeSearchQuery" />
            </div>
            <div class="overview-toolbar-actions">
                <el-button-group v-if="!isMobile">
                    <el-button :icon="Grid" :type="visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = true" title="Visual Display" />
                    <el-button :icon="List" :type="!visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = false" title="Table Display" />
                </el-button-group>

                <el-dropdown trigger="click">
                    <el-button :icon="Menu" circle />
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="bulkEntryVisible = true">Bulk Entry</el-dropdown-item>
                            <el-dropdown-item @click="columnCustomizationVisible = true">Customize Columns</el-dropdown-item>
                            <el-dropdown-item
                                divided
                                :disabled="Object.keys(props.loadedCubes).length === 0"
                                @click="props.clearCubes()"
                            >Remove All Cubes</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>

        <div class="overview-toolbar-row-2">
            <form class="overview-add-form" @submit.prevent="submitAddCubeForm">
                <el-select
                    class="overview-collection-select"
                    label="Collections"
                    v-model="addCubeForm.presetComparisonsSelection"
                    @change="handleCollectionSelect"
                    placeholder="Collections..."
                >
                    <template #footer>
                        <div class="collection-select-header">
                            <el-button
                                text
                                bg
                                type="success"
                                size="small"
                                :disabled="Object.keys(props.loadedCubes).length === 0"
                                @click.stop="openSaveDialog"
                            >Save As...</el-button>
                            <el-divider direction="vertical" />
                            <el-button
                                text
                                bg
                                type="danger"
                                size="small"
                                :disabled="props.userCollections.length === 0"
                                @click.stop="openRemoveDialog"
                            >Remove...</el-button>
                        </div>
                    </template>
                    <el-option-group v-if="props.userCollections.length > 0" label="My Collections">
                        <el-option
                            v-for="col in props.userCollections"
                            :key="col.name"
                            :label="col.name"
                            :value="'__user__:' + col.name"
                        />
                    </el-option-group>
                    <el-option-group label="Presets">
                        <el-option
                            v-for="option in presetComparisonsSelect"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        />
                    </el-option-group>
                </el-select>

                <span class="overview-or-divider">OR</span>

                <div class="overview-cube-id-row">
                    <el-autocomplete
                        ref="cubeAutocompleteRef"
                        v-model="addCubeForm.cubeId"
                        :fetch-suggestions="autocompleteQuerySearch"
                        :trigger-on-focus="true"
                        placeholder="Search history or enter Cube ID"
                        @select="handleAutocompleteSelect"
                        @keyup.enter="submitAddCubeForm"
                        @click="handleAutocompleteClick"
                        clearable
                    >
                        <template #default="{ item }">
                            <div class="cube-autocomplete-item">
                                <span class="cube-autocomplete-name">{{ item.name }}</span>
                                <span class="cube-autocomplete-owner">{{ item.owner }}</span>
                            </div>
                        </template>
                    </el-autocomplete>
                    <el-button type="primary" @click="submitAddCubeForm" :disabled="isLoading">Add</el-button>
                    <input type="submit" style="display: none;" />
                </div>
            </form>

            <div v-if="!isMobile" class="overview-sort-row">
                <label class="sort-label">Sorted by</label>
                <el-select v-model="sortProp" style="width: 150px;" :disabled="!!queryCubeSortDirective?.hasOrder">
                    <el-option
                        v-for="opt in overviewSortProperties"
                        :key="opt.prop"
                        :label="opt.label"
                        :value="opt.prop"
                    />
                </el-select>
                <el-select v-model="sortDirection" style="width: 80px;" :disabled="!!queryCubeSortDirective?.hasDirection">
                    <el-option label="Auto" value="auto" />
                    <el-option label="Asc" value="ascending" />
                    <el-option label="Desc" value="descending" />
                </el-select>
            </div>
        </div>

        <div v-if="isMobile" class="card-table-sort-row">
            <span class="card-table-filter-toggle" @click="viewExpanded = !viewExpanded">
                {{ viewExpanded ? '▴ Options' : '▾ Options' }}
            </span>
        </div>

        <div v-if="isMobile && viewExpanded" class="card-table-mobile-filters">
            <div class="mobile-filter-row">
                <span class="mobile-filter-label">Display</span>
                <el-select v-model="displayModeValue" size="small" class="mobile-filter-control">
                    <el-option label="Grid" value="grid" />
                    <el-option label="Table" value="table" />
                </el-select>
            </div>
            <div class="mobile-filter-row">
                <span class="mobile-filter-label">Sorted by</span>
                <el-select v-model="sortProp" size="small" class="mobile-filter-control" :disabled="!!queryCubeSortDirective?.hasOrder">
                    <el-option
                        v-for="opt in overviewSortProperties"
                        :key="opt.prop"
                        :label="opt.label"
                        :value="opt.prop"
                    />
                </el-select>
            </div>
            <div class="mobile-filter-row">
                <span class="mobile-filter-label">Direction</span>
                <el-select v-model="sortDirection" size="small" class="mobile-filter-control" :disabled="!!queryCubeSortDirective?.hasDirection">
                    <el-option label="Auto" value="auto" />
                    <el-option label="Asc" value="ascending" />
                    <el-option label="Desc" value="descending" />
                </el-select>
            </div>
        </div>

        <div v-if="props.loadingProgress?.active" class="overview-progress">
            <el-progress
                :percentage="loadingProgressPercent"
                :striped="true"
                :striped-flow="true"
                :duration="10"
                :format="() => `${props.loadingProgress?.loaded ?? 0} / ${props.loadingProgress?.total ?? 0}`"
            />
        </div>

        <div v-if="visualDisplayVisible" class="overview-cube-grid">
            <div v-if="sortedData.length === 0" class="overview-cube-grid__empty">
                No cubes loaded.
            </div>
            <div
                v-for="row in sortedData"
                :key="row.id"
                class="overview-cube-tile"
                @click="openCubeDetailDialog?.(row.id)"
            >
                <div class="cube-tile-thumbnail-wrapper">
                    <el-image :src="row.thumbnail" fit="cover" loading="lazy" class="cube-tile-thumbnail" :class="{ 'cube-tile-thumbnail--snapshot': isSnapshot(row) }" />
                    <el-icon v-if="isSnapshot(row)" class="cube-tile-snapshot-badge" title="Snapshot"><Clock /></el-icon>
                    <div class="cube-tile-categories">
                        <el-tag
                            v-for="category in row.stats.assumedCategories"
                            :key="category"
                            size="small"
                            effect="dark"
                            :color="getCategoryTagColor(category)"
                            disable-transitions
                        >
                            {{ category }}
                        </el-tag>
                    </div>
                </div>
                <div class="cube-tile-body">
                    <div class="cube-tile-name">
                        <el-icon v-if="refreshingCubeIds.has(row.id)" class="is-loading" style="margin-right: 4px;"><Loading /></el-icon>
                        {{ displayName(row) }}
                        <el-tag v-if="isSnapshot(row)" size="small" type="info" style="margin-left: 0.5em;">History</el-tag>
                    </div>
                    <div class="cube-tile-owner">
                        <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank" @click.stop>{{ row.owner }}</el-link>
                    </div>
                    <div class="cube-tile-stats">
                        <span class="cube-tile-stat">
                            <el-text size="small" tag="b">{{ row.stats.totalCards }}</el-text>
                            <el-text size="small" type="info">&nbsp;Cards</el-text>
                        </span>
                        <span class="cube-tile-stat">
                            <el-text size="small" tag="b">{{ (row.stats.averageNonLandCmc ?? 0).toFixed(2) }}</el-text>
                            <el-text size="small" type="info">&nbsp;Avg. MV</el-text>
                        </span>
                        <span v-if="activeCheckCount > 0" class="cube-tile-stat">
                            <el-text size="small" tag="b">{{ getChecksPassCount(row.id) }}/{{ activeCheckCount }}</el-text>
                            <el-text size="small" type="info">&nbsp;Checks</el-text>
                        </span>
                        <span class="cube-tile-stat">
                            <el-text size="small" tag="b">{{ getTileSortStat(row).value }}</el-text>
                            <el-text size="small" type="info">&nbsp;{{ getTileSortStat(row).label }}</el-text>
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <StickyTable
            v-else
            :data="sortedData"
            :columns="tableColumns"
            :sortProp="resolvedSortProp"
            :sortOrder="resolvedSortDirection"
            stripe
            @sort-change="handleTableSortChange"
        >
            <template #cell-thumbnail="{ row }">
                <el-image :src="row.thumbnail" class="remove-thumbnail" fit="contain" loading="lazy" style="width: 50px; height: 35px; border-radius: 8px;" />
                <el-button class="remove-button" size="small" type="danger" @click="removeCube(row.id)">
                    <el-icon><Delete /></el-icon>
                </el-button>
            </template>

            <template #cell-rowNumber="{ rowIndex }">
                {{ rowIndex + 1 }}
            </template>

            <template #cell-name="{ row }">
                <el-icon v-if="refreshingCubeIds.has(row.id)" class="is-loading" style="margin-right: 4px;"><Loading /></el-icon>
                <el-link :href="`https://cubecobra.com/cube/about/${externalCubeId(row)}`" target="_blank" @click.prevent="openCubeDetailDialog?.(row.id)">{{ displayName(row) }}</el-link>
                <el-tag v-if="isSnapshot(row)" size="small" type="info" style="margin-left: 0.5em;">History</el-tag>
            </template>

            <template #cell-owner="{ row }">
                <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
            </template>

            <template #cell-lastModified="{ row }">
                <el-tooltip :content="row.lastModified ? new Date(row.lastModified).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }) : ''" placement="top" :hide-after="50" :enterable="false" :disabled="!row.lastModified">
                    <span>{{ fmtDate('lastModified')(row) }}</span>
                </el-tooltip>
            </template>

            <template #cell-arenaPlayable="{ row }">
                <el-tag :type="row.stats.arenaPlayable ? 'success' : 'danger'">
                    {{ row.stats.arenaPlayable ? 'Yes' : 'No' }}
                </el-tag>
            </template>

            <template #cell-mtgoPlayable="{ row }">
                <el-tag :type="row.stats.mtgoPlayable ? 'success' : 'danger'">
                    {{ row.stats.mtgoPlayable ? 'Yes' : 'No' }}
                </el-tag>
            </template>

            <template #cell-paperPlayable="{ row }">
                <el-tag :type="row.stats.paperPlayable ? 'success' : 'danger'">
                    {{ row.stats.paperPlayable ? 'Yes' : 'No' }}
                </el-tag>
            </template>

            <template #cell-assumedCategories="{ row }">
                <div class="tag-list flex gap-2">
                    <el-tooltip
                        v-for="category in row.stats.assumedCategories"
                        :key="category"
                        :content="getCategoryTooltip(category)"
                        placement="top"
                        :hide-after="50"
                    >
                        <el-tag
                            size="small"
                            effect="dark"
                            :color="getCategoryTagColor(category)"
                            disable-transitions
                        >
                            {{ category }}
                        </el-tag>
                    </el-tooltip>
                </div>
            </template>

            <template #cell-averageReleaseYear="{ row }">
                {{ Math.round(row.stats?.averageReleaseYear ?? 0) }} (±{{ (row.stats?.averageReleaseYearStdDev ?? 0).toFixed(1) }})
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.averageReleaseYear ?? 0, 'averageReleaseYear')" />
            </template>

            <template #cell-medianReleaseYear="{ row }">
                {{ Math.round(row.stats?.medianReleaseYear ?? 0) }} (±{{ (row.stats?.medianReleaseYearMAD ?? 0).toFixed(1) }})
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.medianReleaseYear ?? 0, 'medianReleaseYear')" />
            </template>

            <template #cell-totalUniqueCards="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.totalUniqueCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.totalUniqueCards }})</el-text>
            </template>

            <template #cell-newCards="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.newCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.newCards }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.newCards / row.stats.totalCards, 'newCardRatio')" />
            </template>

            <template #cell-landCards="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.landCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.landCards }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.landCards / row.stats.totalCards, 'landRatio')" />
            </template>

            <template #cell-creatureCards="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.creatureCards / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.creatureCards }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.creatureCards / row.stats.totalCards, 'creatureRatio')" />
            </template>

            <template #cell-abnormalLayout="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.abnormalLayout / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.abnormalLayout }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.cardCounts.abnormalLayout / row.stats.totalCards, 'abnormalLayoutRatio')" />
            </template>

            <template #cell-makesTokens="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.makesTokens / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.makesTokens }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.cardCounts.makesTokens / row.stats.totalCards, 'makesTokensRatio')" />
            </template>

            <template #cell-uniqueTokenCount="{ row }">
                <el-text class="cell-primary">{{ row.stats.uniqueTokenCount }}</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.uniqueTokenCount, 'uniqueTokenCount')" />
            </template>

            <template #cell-removal="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.removal / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.removal }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.cardCounts.removal / row.stats.totalCards, 'removalRatio')" />
            </template>

            <template #cell-universesBeyond="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.universesBeyond / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.universesBeyond }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.cardCounts.universesBeyond / row.stats.totalCards, 'universesBeyondRatio')" />
            </template>

            <template #cell-supplementalProduct="{ row }">
                <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.supplementalProduct / row.stats.totalCards) }}</el-text>
                <el-text class="cell-secondary">({{ row.stats.cardCounts.supplementalProduct }})</el-text>
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats.cardCounts.supplementalProduct / row.stats.totalCards, 'supplementalProductRatio')" />
            </template>

            <template #cell-checks="{ row }">
                {{ getChecksPassCount(row.id) }}/{{ activeCheckCount }}
            </template>

            <template #cell-avgSimilarityScore="{ row }">
                {{ (row.avgSimilarityScore * 100).toFixed(2) }}%
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.avgSimilarityScore, 'avgSimilarityScore')" />
            </template>

            <template #cell-averageNonLandCmc="{ row }">
                {{ (row.stats?.averageNonLandCmc ?? 0).toFixed(2) }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.averageNonLandCmc ?? 0, 'averageNonLandCmc')" />
            </template>

            <template #cell-averageElo="{ row }">
                {{ (row.stats?.averageElo ?? 0).toFixed(2) }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.averageElo ?? 0, 'averageElo')" />
            </template>

            <template #cell-averagePopularity="{ row }">
                {{ (row.stats?.averagePopularity ?? 0).toFixed(2) }} %
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.averagePopularity ?? 0, 'averagePopularity')" />
            </template>

            <template #cell-blendedRarityScore="{ row }">
                {{ (row.stats?.blendedRarityScore ?? 0).toFixed(2) }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.blendedRarityScore ?? 0, 'blendedRarityScore')" />
            </template>

            <template #cell-averageWordCount="{ row }">
                {{ (row.stats?.averageWordCount ?? 0).toFixed(2) }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.averageWordCount ?? 0, 'averageWordCount')" />
            </template>

            <template #cell-averageWordCountUnique="{ row }">
                {{ (row.stats?.averageWordCountUnique ?? 0).toFixed(2) }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp(row.stats?.averageWordCountUnique ?? 0, 'averageWordCountUnique')" />
            </template>

            <template #cell-uniqueKeywords="{ row }">
                {{ row.stats?.uniqueKeywords ?? 0 }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp((row.stats?.uniqueKeywords ?? 0) / row.stats.totalCards, 'uniqueKeywords')" />
            </template>

            <template #cell-uniqueNonEvergreenKeywords="{ row }">
                {{ row.stats?.uniqueNonEvergreenKeywords ?? 0 }}
                <StatCmpIndicator v-if="showPeerComparisons" :comparison="rowCmp((row.stats?.uniqueNonEvergreenKeywords ?? 0) / row.stats.totalCards, 'uniqueNonEvergreenKeywords')" />
            </template>
        </StickyTable>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, watch } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useBackDismiss } from '../util/useBackDismiss';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getNestedProp, castInensitiveSort, formatPrice, normalizeSortName } from '../util/HelperFunctions';
import { overviewSortProperties, resolveDirection, stripSortTokens } from '../util/SortConfig';
import type { SortDirection } from '../util/SortConfig';
import { getCategoryTagColor, getCategoryTooltip } from '../util/CubeCategories';
import { bindStorage } from '../util/VueLocalStorage';
import { useWindowSize } from '@vueuse/core';
import { Delete, InfoFilled, Menu, Grid, List, Loading, Clock } from '@element-plus/icons-vue';
import type { UserCollection, Cube } from '../types';
import StickyTable from '../components/StickyTable.vue';
import ColumnCustomizer from '../components/ColumnCustomizer.vue';
import CubeSearchInput from '../components/filters/CubeSearchInput.vue';
import { parseQuery } from '../util/CardFilterParser';
import { displayName, isSnapshot, externalCubeId } from '../util/Snapshots';
import { evaluateCubeFilter, extractCubeSortDirective } from '../util/CubeFilterEvaluator';
import type { CubeFilterContext } from '../util/CubeFilterEvaluator';
import { parseCubeIdInput } from '../util/CubeCobra';
import { openCubeDetailDialogKey } from '../types/injectionKeys';
import type { ChecksState, CheckResult } from '../types/checks';

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value <= 760);
import StatCmpIndicator from '../components/StatCmpIndicator.vue';
import PresetHeader from '../components/PresetHeader.vue';
import type { StickyTableColumn } from '../types/StickyTableColumn';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    overviewTableData: {
        type: Array,
        required: true,
    },
    similarityMatrix: {
        type: Object,
        required: true,
    },
    presetComparisonsSelect: {
        type: Array as () => { label: string; value: string }[],
        required: true,
    },
    addCube: {
        type: Function,
        required: true,
    },
    removeCube: {
        type: Function,
        required: true,
    },
    clearCubes: {
        type: Function,
        required: true,
    },
    loadCollection: {
        type: Function,
        required: true,
    },
    userCollections: {
        type: Array as () => UserCollection[],
        default: () => [],
    },
    saveCollection: {
        type: Function as unknown as () => (name: string) => void,
        default: null,
    },
    loadUserCollection: {
        type: Function as unknown as () => (name: string) => Promise<void>,
        default: null,
    },
    removeCollection: {
        type: Function as unknown as () => (name: string) => void,
        default: null,
    },
    loadingProgress: {
        type: Object as () => { active: boolean; loaded: number; total: number } | null,
        default: null,
    },
    peerStats: {
        type: Object as () => Record<string, { mean: number; stddev: number }> | null,
        default: null,
    },
    activePreset: {
        type: Object as () => import('../types').PresetCollection | null,
        default: null,
    },
});

const defaultColumnOrder = [
    'rowNumber',
    'name',
    'owner',
    'lastModified',
    'followerCount',
    'stats.arenaPlayable',
    'stats.mtgoPlayable',
    'stats.paperPlayable',
    'stats.assumedCategories',
    'stats.totalMinPriceUsd',
    'stats.totalMinPriceTix',
    'stats.averageReleaseYear',
    'stats.medianReleaseYear',
    'stats.totalCards',
    'stats.totalUniqueCards',
    'stats.newCards',
    'stats.landCards',
    'stats.creatureCards',
    'avgSimilarityScore',
    'stats.averageNonLandCmc',
    'stats.averageElo',
    'stats.averagePopularity',
    'stats.blendedRarityScore',
    'stats.averageWordCount',
    'stats.averageWordCountUnique',
    'stats.uniqueKeywords',
    'stats.uniqueNonEvergreenKeywords',
    'stats.cardCounts.abnormalLayout',
    'stats.cardCounts.makesTokens',
    'stats.uniqueTokenCount',
    'stats.cardCounts.removal',
    'stats.cardCounts.universesBeyond',
    'stats.cardCounts.supplementalProduct',
    'checks',
];

const columnMeta: Record<string, { label: string; tooltip?: string }> = {
    'rowNumber': { label: 'Row Number' },
    'name': { label: 'Name' },
    'owner': { label: 'Owner' },
    'lastModified': { label: 'Last Modified', tooltip: 'Date when the contents or description of the cube was last modified' },
    'followerCount': { label: 'Followers', tooltip: 'Number of users following the cube on CubeCobra' },
    'stats.arenaPlayable': { label: 'Arena Playable', tooltip: 'Whether the cube is playable on MTG Arena' },
    'stats.mtgoPlayable': { label: 'MTGO Playable', tooltip: 'Whether the cube is playable on MTGO' },
    'stats.paperPlayable': { label: 'Paper Playable', tooltip: 'Whether the cube is playable in Paper (no Digital-only printings, no Custom cards)' },
    'stats.assumedCategories': { label: 'Categories', tooltip: 'Assumed Categorization of the cube based on its contents (pauper, peasant, powered, desert)' },
    'stats.totalMinPriceUsd': { label: 'Min Price (USD)', tooltip: 'Total Minimum Price of the Cube in USD' },
    'stats.totalMinPriceTix': { label: 'Min Price (Tix)', tooltip: 'Total Minimum Price of the Cube in MTGO Tix' },
    'stats.averageReleaseYear': { label: 'Avg. Release Year', tooltip: 'Average Release Year of Cards in the Cube (± Standard Deviation)' },
    'stats.medianReleaseYear': { label: 'Median Release Year', tooltip: 'Median Release Year of Cards in the Cube (± Median Absolute Deviation)' },
    'stats.totalCards': { label: 'Total Cards', tooltip: 'Total Number of Cards' },
    'stats.totalUniqueCards': { label: 'Unique Cards', tooltip: 'Number of unique cards by oracle ID' },
    'stats.newCards': { label: 'New Cards', tooltip: 'Cards Released in the Last 12 Months' },
    'stats.landCards': { label: 'Lands', tooltip: 'Cards that are playable from hand as a Land, includes MDFCs' },
    'stats.creatureCards': { label: 'Creatures', tooltip: "Cards with 'Creature' in their Type Line" },
    'avgSimilarityScore': { label: 'Avg. Similarity', tooltip: 'Average Cosine Similarity Score vs. Other Loaded Cubes' },
    'stats.averageNonLandCmc': { label: 'Avg. Mana Value', tooltip: 'Average Mana Value of Non-Land Cards' },
    'stats.averageElo': { label: 'Avg. Card Elo', tooltip: 'Average CubeCobra Card Elo Rating' },
    'stats.averagePopularity': { label: 'Avg. Card Popularity', tooltip: 'Average CubeCobra Card Popularity Score' },
    'stats.blendedRarityScore': { label: 'Rarity Score', tooltip: 'Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200' },
    'stats.averageWordCount': { label: 'Avg. Word Count', tooltip: 'Average Oracle Text Word Count, excluding Reminder Text' },
    'stats.averageWordCountUnique': { label: 'Avg. Word Count (Unique)', tooltip: 'Average Oracle Text Word Count of Unique Cards, excluding Reminder Text' },
    'stats.uniqueKeywords': { label: 'Keywords', tooltip: 'Number of Unique Keywords' },
    'stats.uniqueNonEvergreenKeywords': { label: 'Non-Evergreen Keywords', tooltip: 'Number of Unique Non-Evergreen Keywords' },
    'stats.cardCounts.abnormalLayout': { label: 'Abnormal Layout', tooltip: 'Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)' },
    'stats.cardCounts.makesTokens': { label: 'Makes Tokens', tooltip: 'Cards that Create one or more Tokens' },
    'stats.uniqueTokenCount': { label: 'Unique Tokens', tooltip: 'Number of unique tokens produced by cards in the cube' },
    'stats.cardCounts.removal': { label: 'Removal', tooltip: "Cards tagged as 'removal' in Scryfall's Tagger" },
    'stats.cardCounts.universesBeyond': { label: 'Universes Beyond', tooltip: 'Cards originally from Universes Beyond Products (includes Standard sets)' },
    'stats.cardCounts.supplementalProduct': { label: 'Supplemental Product', tooltip: 'Cards originally from Supplemental Products (includes Portal)' },
    'checks': { label: 'Checks', tooltip: 'Number of passing checks from the active check collection' },
};

const defaultConfig = {
    columnOrder: [...defaultColumnOrder],
    visibleColumns: [
        'rowNumber',
        'name',
        'owner',
        'stats.totalCards',
        'stats.newCards',
        'avgSimilarityScore',
        'stats.averageNonLandCmc',
        'stats.averageWordCountUnique',
        'stats.cardCounts.removal',
        'stats.uniqueNonEvergreenKeywords',
    ],
    peerComparisons: true,
};

const config = bindStorage('cube-app-config', (v) => {
    if (v == undefined || v === null) {
        return { ...defaultConfig, columnOrder: [...defaultColumnOrder] };
    }
    const visibleColumns = Array.isArray(v.visibleColumns)
        ? v.visibleColumns.filter((c: string) => c !== 'peerComparisons')
        : [...defaultConfig.visibleColumns];
    const peerComparisons = typeof v.peerComparisons === 'boolean'
        ? v.peerComparisons
        : (Array.isArray(v.visibleColumns) && v.visibleColumns.includes('peerComparisons'));
    let columnOrder = Array.isArray(v.columnOrder) ? v.columnOrder : [...defaultColumnOrder];
    // Append any new columns not yet in the stored order
    for (const key of defaultColumnOrder) {
        if (!columnOrder.includes(key)) {
            columnOrder.push(key);
        }
    }
    // Remove keys no longer in defaults (column was removed from code)
    columnOrder = columnOrder.filter((key: string) => defaultColumnOrder.includes(key));
    return { columnOrder, visibleColumns, peerComparisons };
});

interface CubeHistoryEntry {
    id: string;
    shortId?: string;
    name: string;
    owner: string;
}

const cubeAddHistory = bindStorage<CubeHistoryEntry[]>('cube-add-history', v => Array.isArray(v) ? v : []);

const cubeAutocompleteRef = ref<{ getData: (query: string) => void } | null>(null);

function recordCubeHistory(cubeId: string) {
    const cube = (Object.values(props.loadedCubes) as Cube[]).find(
        c => c.id === cubeId || c.shortId === cubeId,
    );
    if (!cube) return;
    const entry: CubeHistoryEntry = {
        id: cube.id,
        shortId: cube.shortId,
        name: cube.name,
        owner: cube.owner,
    };
    // Remove existing entry for this cube (by id) so we can move it to front
    const filtered = cubeAddHistory.value.filter(e => e.id !== entry.id);
    // Prepend and cap at 100
    cubeAddHistory.value = [entry, ...filtered].slice(0, 100);
}

function autocompleteQuerySearch(queryString: string, cb: (results: any[]) => void) {
    const loadedIds = new Set(Object.keys(props.loadedCubes));
    const available = cubeAddHistory.value.filter(e => !loadedIds.has(e.id));
    if (!queryString) {
        cb(available.map(e => ({ value: e.name, ...e })));
        return;
    }
    const q = queryString.toLowerCase();
    const filtered = available.filter(
        e => e.name.toLowerCase().includes(q) || e.owner.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || (e.shortId && e.shortId.toLowerCase().includes(q)),
    );
    cb(filtered.map(e => ({ value: e.name, ...e })));
}

async function handleAutocompleteSelect(item: CubeHistoryEntry & { value: string }) {
    addCubeForm.loading = true;
    await props.addCube(item.id, { refresh: true });
    recordCubeHistory(item.id);
    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
    // Focus is retained natively by el-autocomplete; the dropdown will reopen on
    // the user's next input or when they click back into the field.
}

function handleAutocompleteClick() {
    // The input keeps native focus after a selection, so focus events won't fire
    // on a subsequent click; open the suggestions manually.
    cubeAutocompleteRef.value?.getData(addCubeForm.cubeId);
}

const columnCustomizationVisible = ref(false);
useBackDismiss(columnCustomizationVisible, () => { columnCustomizationVisible.value = false; });

const bulkEntryVisible = ref(false);
useBackDismiss(bulkEntryVisible, () => { bulkEntryVisible.value = false; });
const bulkEntryText = ref('');

const handleBulkEntryOpen = () => {
    const keys = Object.keys(props.loadedCubes);
    bulkEntryText.value = keys.join('\n');
};

const handleBulkEntrySubmit = async () => {
    const newIds = bulkEntryText.value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    const newIdSet = new Set(newIds);
    const currentKeys = Object.keys(props.loadedCubes);

    // Remove cubes no longer in the list
    for (const key of currentKeys) {
        if (!newIdSet.has(key)) {
            props.removeCube(key);
        }
    }

    // Add new cubes not already loaded
    const currentKeySet = new Set(currentKeys);
    for (const id of newIds) {
        if (!currentKeySet.has(id)) {
            await props.addCube(id, { refresh: true });
        }
    }

    bulkEntryVisible.value = false;
};
const visualDisplayVisible = bindStorage('overview-display-mode-visual', (v) => typeof v === 'boolean' ? v : isMobile.value);
const displayModeValue = computed({
    get: () => visualDisplayVisible.value ? 'grid' : 'table',
    set: (val: string) => { visualDisplayVisible.value = val === 'grid'; },
});

const addCubeForm = reactive({
    loading: false,
    cubeId: '',
    presetComparisonsSelection: '',
});

const isLoading = computed(() => addCubeForm.loading || !!props.loadingProgress?.active);

const loadingText = computed(() => {
    if (props.loadingProgress?.active && (props.loadingProgress.total ?? 0) > 1) {
        return `Loading cubes (${props.loadingProgress.loaded} / ${props.loadingProgress.total})`;
    }
    return undefined;
});

const loadingProgressPercent = computed(() => {
    const { loaded, total } = props.loadingProgress ?? { loaded: 0, total: 0 };
    if (!total) return 0;
    return Math.round((loaded / total) * 100);
});

const openCubeDetailDialog = inject(openCubeDetailDialogKey);
const refreshingCubeIds = inject<Ref<Set<string>>>('refreshingCubeIds', ref(new Set()));
const checksState = inject<Ref<ChecksState>>('checksState')!;
const checkResults = inject<ComputedRef<Map<string, Map<string, CheckResult>>>>('checkResults')!;

const activeCheckCount = computed(() => {
    const id = checksState.value.activeCollectionId;
    if (!id) return 0;
    const collection = checksState.value.collections.find(c => c.id === id);
    return collection?.conditions.length ?? 0;
});

function getChecksPassCount(cubeId: string): number {
    const cubeMap = checkResults.value.get(cubeId);
    if (!cubeMap) return 0;
    return [...cubeMap.values()].filter(r => r.passed).length;
}

const submitAddCubeForm = async () => {
    addCubeForm.loading = true;
    const inputId = addCubeForm.cubeId.trim();
    await props.addCube(inputId, { refresh: true });
    if (inputId) {
        recordCubeHistory(parseCubeIdInput(inputId));
    }
    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
};

const handleCollectionSelect = async (value: string) => {
    addCubeForm.loading = true;
    if (value.startsWith('__user__:')) {
        const name = value.slice('__user__:'.length);
        await props.loadUserCollection(name);
    } else {
        await props.loadCollection(value);
    }
    addCubeForm.loading = false;
    addCubeForm.presetComparisonsSelection = '';
};

// Save collection dialog
const saveDialogVisible = ref(false);
useBackDismiss(saveDialogVisible, () => { saveDialogVisible.value = false; });
const saveDialogName = ref('');

const openSaveDialog = () => {
    saveDialogName.value = '';
    saveDialogVisible.value = true;
};

const handleSaveCollection = async () => {
    const name = saveDialogName.value.trim();
    if (!name) return;
    const exists = props.userCollections.some((c: UserCollection) => c.name === name);
    if (exists) {
        try {
            await ElMessageBox.confirm(
                `A collection named "${name}" already exists. Overwrite it?`,
                'Overwrite Collection',
                { type: 'warning', confirmButtonText: 'Overwrite', cancelButtonText: 'Cancel' },
            );
        } catch {
            return;
        }
    }
    props.saveCollection(name);
    saveDialogVisible.value = false;
    saveDialogName.value = '';
    ElMessage({ type: 'success', message: `Collection "${name}" saved.` });
};

// Remove collection dialog
const removeDialogVisible = ref(false);
useBackDismiss(removeDialogVisible, () => { removeDialogVisible.value = false; });

const openRemoveDialog = () => {
    removeDialogVisible.value = true;
};

const handleRemoveCollection = async (name: string) => {
    try {
        await ElMessageBox.confirm(
            `Delete collection "${name}"? This cannot be undone.`,
            'Remove Collection',
            { type: 'warning', confirmButtonText: 'Delete', cancelButtonText: 'Cancel' },
        );
    } catch {
        return;
    }
    props.removeCollection(name);
    if (props.userCollections.length === 0) {
        removeDialogVisible.value = false;
    }
};

const removeCube = (cubeId: string) => {
    props.removeCube(cubeId);
};

const showPeerComparisons = computed(() => config.value.peerComparisons);

const rowCmp = (value: number, key: string): 'high' | 'low' | null => {
    if (!props.peerStats) return null;
    const s = props.peerStats[key];
    if (!s || s.stddev === 0) return null;
    if (value > s.mean + s.stddev) return 'high';
    if (value < s.mean - s.stddev) return 'low';
    return null;
};

// --- Sort state ---
const sortProp = inject<Ref<string>>('overviewSortProp', ref('name'));
const sortDirection = inject<Ref<SortDirection>>('overviewSortDirection', ref('auto'));

watch(sortProp, (_newVal, oldVal) => {
    if (oldVal !== undefined && queryCubeSortDirective.value) {
        cubeSearchQuery.value = stripSortTokens(cubeSearchQuery.value);
    }
    sortDirection.value = 'auto';
});

watch(sortDirection, (newVal, oldVal) => {
    if (oldVal !== undefined && newVal !== 'auto' && queryCubeSortDirective.value) {
        cubeSearchQuery.value = stripSortTokens(cubeSearchQuery.value);
    }
});

const resolvedSortDirection = computed(() => {
    if (queryCubeSortDirective.value?.hasDirection) {
        return queryCubeSortDirective.value.order;
    }
    return resolveDirection(sortDirection.value, sortProp.value, overviewSortProperties);
});

const resolvedSortProp = computed(() => {
    if (queryCubeSortDirective.value?.hasOrder) {
        return queryCubeSortDirective.value.prop;
    }
    return sortProp.value;
});

function handleTableSortChange(payload: { prop: string; order: 'ascending' | 'descending' }) {
    if (queryCubeSortDirective.value) {
        cubeSearchQuery.value = stripSortTokens(cubeSearchQuery.value);
    }
    sortProp.value = payload.prop;
    sortDirection.value = payload.order;
}

// --- Formatter helpers ---
const fmtFixed2 = (prop: string) => (row: any) => (getNestedProp(row, prop) ?? 0).toFixed(2);
const fmtPriceUsd = (prop: string) => (row: any) => '$' + formatPrice(getNestedProp(row, prop) ?? 0);
const fmtPriceTix = (prop: string) => (row: any) => formatPrice(getNestedProp(row, prop) ?? 0);
const fmtPopularity = (prop: string) => (row: any) => (getNestedProp(row, prop) ?? 0).toFixed(2) + ' %';
const fmtPercentage = (prop: string) => (row: any) => ((getNestedProp(row, prop) ?? 0) * 100).toFixed(2) + '%';
const fmtDate = (prop: string) => (row: any) => {
    const ts = getNestedProp(row, prop);
    if (!ts) return 'N/A';
    return new Date(ts).toISOString().slice(0, 10);
};

// --- Table column definitions ---
const columnDefsMap: Record<string, StickyTableColumn> = {
    'rowNumber': { key: 'rowNumber', label: '#', width: '50px' },
    'name': { key: 'name', prop: 'name', label: 'Name', minWidth: '120px', maxWidth: '240px', showOverflowTooltip: true, sortable: true },
    'owner': { key: 'owner', prop: 'owner', label: 'Owner', minWidth: '90px', maxWidth: '160px', showOverflowTooltip: true, sortable: true },
    'lastModified': { key: 'lastModified', prop: 'lastModified', label: 'Modified', minWidth: '90px', formatter: fmtDate('lastModified'), sortable: true, tooltip: 'Date the cube was last modified' },
    'followerCount': { key: 'followerCount', prop: 'followerCount', label: 'Followers', minWidth: '80px', sortable: true },
    'stats.arenaPlayable': { key: 'arenaPlayable', prop: 'stats.arenaPlayable', label: 'Arena', minWidth: '65px', tooltip: 'Arena Playable — all cards available on MTG Arena' },
    'stats.mtgoPlayable': { key: 'mtgoPlayable', prop: 'stats.mtgoPlayable', label: 'MTGO', minWidth: '65px', tooltip: 'MTGO Playable — all cards available on Magic Online' },
    'stats.paperPlayable': { key: 'paperPlayable', prop: 'stats.paperPlayable', label: 'Paper', minWidth: '65px', tooltip: 'Paper Playable — no digital-only printings or custom cards' },
    'stats.assumedCategories': { key: 'assumedCategories', prop: 'stats.assumedCategories', label: 'Categories', minWidth: '75px' },
    'stats.totalMinPriceUsd': { key: 'totalMinPriceUsd', prop: 'stats.totalMinPriceUsd', label: 'Price (USD)', minWidth: '80px', formatter: fmtPriceUsd('stats.totalMinPriceUsd'), sortable: true, tooltip: 'Total minimum price of the cube in USD' },
    'stats.totalMinPriceTix': { key: 'totalMinPriceTix', prop: 'stats.totalMinPriceTix', label: 'Price (Tix)', minWidth: '80px', formatter: fmtPriceTix('stats.totalMinPriceTix'), sortable: true, tooltip: 'Total minimum price of the cube in MTGO Tix' },
    'stats.averageReleaseYear': { key: 'averageReleaseYear', prop: 'stats.averageReleaseYear', label: 'Avg. Year', minWidth: '85px', sortable: true, tooltip: 'Average release year of cards in the cube (± Standard Deviation)' },
    'stats.medianReleaseYear': { key: 'medianReleaseYear', prop: 'stats.medianReleaseYear', label: 'Med. Year', minWidth: '85px', sortable: true, tooltip: 'Median release year of cards in the cube (± Median Absolute Deviation)' },
    'stats.totalCards': { key: 'totalCards', prop: 'stats.totalCards', label: 'Cards', minWidth: '65px', sortable: true, tooltip: 'Total number of cards' },
    'stats.totalUniqueCards': { key: 'totalUniqueCards', prop: 'stats.totalUniqueCards', label: 'Unique', minWidth: '75px', sortable: true, tooltip: 'Number of unique cards by oracle ID' },
    'stats.newCards': { key: 'newCards', prop: 'stats.newCards', label: 'New', minWidth: '65px', sortable: true, tooltip: 'Cards Released in the Last 12 Months' },
    'stats.landCards': { key: 'landCards', prop: 'stats.landCards', label: 'Lands', minWidth: '65px', sortable: true },
    'stats.creatureCards': { key: 'creatureCards', prop: 'stats.creatureCards', label: 'Creatures', minWidth: '75px', sortable: true },
    'avgSimilarityScore': { key: 'avgSimilarityScore', prop: 'avgSimilarityScore', label: 'Similarity', minWidth: '75px', formatter: fmtPercentage('avgSimilarityScore'), sortable: true, tooltip: 'Average Cosine Similarity Score vs. Other Loaded Cubes' },
    'stats.averageNonLandCmc': { key: 'averageNonLandCmc', prop: 'stats.averageNonLandCmc', label: 'Avg. MV', minWidth: '70px', formatter: fmtFixed2('stats.averageNonLandCmc'), sortable: true, tooltip: 'Average Mana Value of Non-Land Cards' },
    'stats.averageElo': { key: 'averageElo', prop: 'stats.averageElo', label: 'Avg. Elo', minWidth: '70px', formatter: fmtFixed2('stats.averageElo'), sortable: true, tooltip: 'Average CubeCobra Elo Rating' },
    'stats.averagePopularity': { key: 'averagePopularity', prop: 'stats.averagePopularity', label: 'Avg. Pop.', minWidth: '70px', formatter: fmtPopularity('stats.averagePopularity'), sortable: true, tooltip: 'Average CubeCobra Card Popularity %' },
    'stats.blendedRarityScore': { key: 'blendedRarityScore', prop: 'stats.blendedRarityScore', label: 'Rarity', minWidth: '65px', formatter: fmtFixed2('stats.blendedRarityScore'), sortable: true, tooltip: 'Blended Rarity Score — minimum rarity per card, C=0.333, U=0.666, R=1.000, M=1.200' },
    'stats.averageWordCount': { key: 'averageWordCount', prop: 'stats.averageWordCount', label: 'Avg. Words', minWidth: '75px', formatter: fmtFixed2('stats.averageWordCount'), sortable: true, tooltip: 'Average Oracle Text Word Count (excluding Reminder Text)' },
    'stats.averageWordCountUnique': { key: 'averageWordCountUnique', prop: 'stats.averageWordCountUnique', label: 'Avg. Words*', minWidth: '80px', formatter: fmtFixed2('stats.averageWordCountUnique'), sortable: true, tooltip: 'Average Oracle Text Word Count of Unique Cards (excluding Reminder Text)' },
    'stats.uniqueKeywords': { key: 'uniqueKeywords', prop: 'stats.uniqueKeywords', label: 'Keywords', minWidth: '75px', sortable: true, tooltip: 'Number of unique keywords' },
    'stats.uniqueNonEvergreenKeywords': { key: 'uniqueNonEvergreenKeywords', prop: 'stats.uniqueNonEvergreenKeywords', label: 'Non-EG KW', minWidth: '80px', sortable: true, tooltip: 'Number of unique non-evergreen keywords' },
    'stats.cardCounts.abnormalLayout': { key: 'abnormalLayout', prop: 'stats.cardCounts.abnormalLayout', label: 'Abn. Layout', minWidth: '80px', sortable: true, tooltip: 'Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)' },
    'stats.cardCounts.makesTokens': { key: 'makesTokens', prop: 'stats.cardCounts.makesTokens', label: 'Tokens', minWidth: '65px', sortable: true, tooltip: 'Cards that create one or more tokens' },
    'stats.uniqueTokenCount': { key: 'uniqueTokenCount', prop: 'stats.uniqueTokenCount', label: 'Uniq. Tokens', minWidth: '80px', sortable: true, tooltip: 'Number of unique tokens produced by cards in the cube' },
    'stats.cardCounts.removal': { key: 'removal', prop: 'stats.cardCounts.removal', label: 'Removal', minWidth: '70px', sortable: true, tooltip: "Cards tagged as 'removal' in Scryfall's Tagger" },
    'stats.cardCounts.universesBeyond': { key: 'universesBeyond', prop: 'stats.cardCounts.universesBeyond', label: 'UB', minWidth: '55px', sortable: true, tooltip: 'Universes Beyond — cards originally from non-Magic IP products (includes Standard sets)' },
    'stats.cardCounts.supplementalProduct': { key: 'supplementalProduct', prop: 'stats.cardCounts.supplementalProduct', label: 'Supp.', minWidth: '60px', sortable: true, tooltip: 'Supplemental Product — cards originally from supplemental products (includes Portal)' },
    'checks': { key: 'checks', prop: 'checksPassCount', label: 'Checks', minWidth: '70px', sortable: true, tooltip: 'Checks passed / total from active collection' },
};

const tileRepresentedSorts = new Set(['name', 'owner', 'stats.totalCards', 'stats.averageNonLandCmc', 'checksPassCount']);

function isRatioSortProp(prop: string): boolean {
    return prop === 'stats.newCards' || prop === 'stats.landCards' || prop === 'stats.creatureCards' || prop === 'stats.totalUniqueCards' || prop.startsWith('stats.cardCounts.');
}

function getTileSortStat(row: any): { label: string; value: string } {
    const prop = resolvedSortProp.value;

    if (tileRepresentedSorts.has(prop)) {
        const col = columnDefsMap['lastModified'];
        return { label: col.label, value: col.formatter!(row) };
    }

    const col = columnDefsMap[prop];
    if (col) {
        if (isRatioSortProp(prop)) {
            const ratio = (getNestedProp(row, prop) ?? 0) / (row.stats.totalCards || 1);
            return { label: col.label, value: formatters.percentageFormatter(ratio) };
        }
        const value = col.formatter ? col.formatter(row) : String(getNestedProp(row, prop) ?? '');
        return { label: col.label, value };
    }

    const fallback = columnDefsMap['lastModified'];
    return { label: fallback.label, value: fallback.formatter!(row) };
}

const tableColumns = computed<StickyTableColumn[]>(() => {
    const pinnedColumns: StickyTableColumn[] = [
        { key: 'thumbnail', label: '', width: '75px' },
    ];
    const orderedColumns = config.value.columnOrder
        .filter((key: string) => config.value.visibleColumns.includes(key))
        .map((key: string) => columnDefsMap[key])
        .filter(Boolean);
    return [...pinnedColumns, ...orderedColumns];
});

// --- Filtered + sorted data ---
const viewExpanded = ref(false);
const cubeSearchQuery = inject<Ref<string>>('overviewSearchQuery', ref(''));
const parsedCubeQuery = computed(() => parseQuery(cubeSearchQuery.value));
const queryCubeSortDirective = computed(() => extractCubeSortDirective(parsedCubeQuery.value.ast));

const filteredData = computed(() => {
    const data = props.overviewTableData as any[];
    const hasQuery = !!cubeSearchQuery.value.trim() && !!parsedCubeQuery.value.ast;
    if (!hasQuery) return data;

    return data.filter(cube => {
        const cards = props.loadedCubes[cube.id]?.cards || [];
        const ctx: CubeFilterContext = { cards, checksPassCount: getChecksPassCount(cube.id) };
        return evaluateCubeFilter(parsedCubeQuery.value.ast, cube, ctx);
    });
});

const sortedData = computed(() => {
    const data = [...filteredData.value];
    const prop = queryCubeSortDirective.value?.hasOrder ? queryCubeSortDirective.value.prop : sortProp.value;
    const dir = resolvedSortDirection.value === 'ascending' ? 1 : -1;

    return data.sort((a, b) => {
        // Checks sort (virtual property, not on the cube object)
        if (prop === 'checksPassCount') {
            const aVal = getChecksPassCount(a.id);
            const bVal = getChecksPassCount(b.id);
            if (aVal !== bVal) return (aVal - bVal) * dir;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // Use ratioSort for columns displayed as percentages of totalCards
        if (prop === 'stats.newCards' || prop === 'stats.landCards' || prop === 'stats.creatureCards' || prop === 'stats.totalUniqueCards' || prop.startsWith('stats.cardCounts.')) {
            const aRatio = getNestedProp(a, prop) / a.stats.totalCards;
            const bRatio = getNestedProp(b, prop) / b.stats.totalCards;
            if (aRatio !== bRatio) return (aRatio - bRatio) * dir;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // Name and owner use NFKD localeCompare
        if (prop === 'name') {
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name)) * dir;
        }
        if (prop === 'owner') {
            const ownerCmp = castInensitiveSort(a.owner, b.owner) * dir;
            if (ownerCmp !== 0) return ownerCmp;
            return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        }

        // Generic numeric sort
        const aVal = getNestedProp(a, prop);
        const bVal = getNestedProp(b, prop);
        const aNull = aVal == null;
        const bNull = bVal == null;
        if (aNull && bNull) return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
        if (aNull) return 1;
        if (bNull) return -1;
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name));
    });
});

const formatters = {
    percentageFormatter: (value: number) => {
        return (value * 100).toFixed(2) + '%';
    },
};
</script>

<style scoped>
.overview-toolbar-row-1 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.overview-search-input {
    flex: 1 1 0;
    min-width: 0;
}

.overview-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
}

.overview-toolbar-row-2 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.overview-sort-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
}

.sort-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
}

.card-table-sort-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 8px 0;
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

.overview-search-row {
    margin-bottom: 10px;
}

.overview-add-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    flex: 1 1 400px;
    max-width: 600px;
    min-width: 0;
}

.overview-collection-select {
    flex: 1 1 140px;
    min-width: 140px;
}

.overview-or-divider {
    flex: 0 0 auto;
    color: var(--el-text-color-secondary);
}

.overview-cube-id-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 200px;
}

.cube-autocomplete-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
}

.cube-autocomplete-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cube-autocomplete-owner {
    color: var(--el-text-color-placeholder);
    font-size: 12px;
    flex-shrink: 0;
}

@media (max-width: 600px) {
    .overview-add-form {
        display: contents;
    }

    .overview-cube-id-row {
        flex-basis: 100%;
        order: -1;
    }

    .overview-collection-select {
        flex: 1 1 0;
        min-width: 120px;
    }

    .overview-or-divider {
        display: none;
    }
}

.collection-select-header {
    display: flex;
    align-items: center;
    justify-content: center;
}

.collection-remove-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.collection-remove-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.collection-remove-item:last-child {
    border-bottom: none;
}

.overview-progress {
    margin-bottom: 8px;
}

.overview-loading-container {
    position: relative;
    min-height: 120px;
}

.overview-cube-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    padding: 4px 0;
}

.overview-cube-grid__empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px 16px;
    color: var(--el-text-color-secondary);
}

.overview-cube-tile {
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.overview-cube-tile:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.cube-tile-thumbnail-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: 4px 4px 0 0;
}

.cube-tile-thumbnail {
    width: 100%;
    aspect-ratio: 4 / 3;
    display: block;
    background-color: var(--el-fill-color);
}

.cube-tile-categories {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 4px;
    padding: 16px 6px 4px;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.55));
    overflow: hidden;
    flex-wrap: nowrap;
}

.cube-tile-body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.cube-tile-name {
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-text-color-primary);
}

.cube-tile-owner {
    font-size: 12px;
    color: var(--el-text-color-placeholder);

    :deep(.el-link) {
        color: var(--el-text-color-placeholder);
        font-size: 12px;
    }

    :deep(.el-link:hover) {
        color: var(--el-color-primary);
    }
}

.cube-tile-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 2px;
}

.cube-tile-stat {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
}

@media (max-width: 760px) {
    .overview-cube-grid {
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .overview-cube-tile {
        flex-direction: row;
    }

    .cube-tile-thumbnail-wrapper {
        width: 80px;
        max-height: 80px;
        flex-shrink: 0;
        border-radius: 4px 0 0 4px;
    }

    .cube-tile-thumbnail {
        height: 100%;
        /* max-height: 64px; */
        max-height: 100%;
        aspect-ratio: unset;
    }

    .cube-tile-categories {
        display: none;
    }

    .cube-tile-body {
        padding: 6px 10px;
        justify-content: center;
    }
}


:global(.overview-loading.el-loading-mask) {
    align-items: flex-start !important;
    padding-top: 60px !important;
}

:global(.overview-loading.el-loading-mask .el-loading-spinner) {
    position: absolute !important;
    top: 60px !important;
    margin-top: 0 !important;
}

:global(.overview-loading .el-loading-text) {
    color: var(--el-text-color-primary) !important;
    font-size: 14px;
}

.cube-tile-thumbnail--snapshot {
    opacity: 0.7;
    filter: grayscale(0.3);
}

.cube-tile-snapshot-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    padding: 4px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    font-size: 14px;
    z-index: 1;
}
</style>
