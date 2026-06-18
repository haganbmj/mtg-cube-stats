<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <div class="header-row">
                    <el-breadcrumb separator=" / " class="header-breadcrumb">
                        <el-breadcrumb-item>
                            <a href="https://griselbrand.com">griselbrand.com</a>
                        </el-breadcrumb-item>
                        <el-breadcrumb-item class="header-page-title">Cube Comparison</el-breadcrumb-item>
                    </el-breadcrumb>
                    <div class="header-links">
                        <a href="https://bsky.app/profile/griselbrand.com" target="_blank" title="Bluesky">
                            <svg fill="none" viewBox="0 0 64 57" width="22" style="height: auto;"><path fill="currentColor" d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805ZM50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745Z"/></svg>
                        </a>
                        <el-divider direction="vertical" />
                        <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank" title="GitHub">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                        </a>
                    </div>
                </div>
            </el-header>
            <el-main>
                <div id="contents">
                    <el-tabs tab-position="top" v-model="activeTab">
                        <el-tab-pane :label="'Cubes (' + Object.keys(loadedCubes).length + ')'" name="overview" :lazy="true">
                            <OverviewTab
                                :loadedCubes="loadedCubes"
                                :overviewTableData="overviewTableData"
                                :similarityMatrix="similarityMatrix"
                                :presetComparisonsSelect="presetComparisonsSelect"
                                :addCube="addCube"
                                :removeCube="removeCube"
                                :clearCubes="clearCubes"
                                :loadCollection="loadCollection"
                                :userCollections="userCollections"
                                :saveCollection="saveCollection"
                                :loadUserCollection="loadUserCollection"
                                :removeCollection="removeCollection"
                                :loadingProgress="loadingProgress"
                                :peerStats="peerStats"
                                :activePreset="activePreset"
                            />
                        </el-tab-pane>

                        <el-tab-pane label="Infographic" name="infographic" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <InfographicTab :loadedCubes="visibleLoadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" :loadingProgress="loadingProgress" :activePreset="activePreset" />
                        </el-tab-pane>

                        <el-tab-pane label="Statistics" name="statistics" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <StatisticsTab :loadedCubes="overviewTableData" :loadingProgress="loadingProgress" />
                        </el-tab-pane>

                        <!-- <el-tab-pane label="Themes" name="archetypes" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <ArchetypeAnalysisTab :loadedCubes="visibleLoadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane> -->

                        <el-tab-pane label="Compare" name="compare" :lazy="true">
                            <ComparisonTab :loadedCubes="loadedCubes" :addCube="addCube" :comparePair="comparePair" :loadingProgress="loadingProgress" @update:compare-pair="(v) => comparePair = v" />
                        </el-tab-pane>

                        <el-tab-pane label="Cards" name="cards" :lazy="true">
                            <CardsTab :loadedCubes="visibleLoadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" :loadingProgress="loadingProgress" />
                        </el-tab-pane>

                        <el-tab-pane label="About" name="about" :lazy="true">
                            <About />
                        </el-tab-pane>
                    </el-tabs>

                    <template v-for="(entry) in navigationStack" :key="entry.key">
                        <CubeDetailDialog
                            v-if="entry.type === 'cube'"
                            :visible="true"
                            :modal="true"
                            :cubeRow="getCubeRow(entry.id)"
                            :cubeCards="getCubeCards(entry.id)"
                            :similarityMatrix="similarityMatrix"
                            :overviewTableData="overviewTableData"
                            :loadedCubes="loadedCubes"
                            :peerStats="peerStats"
                            @close="popDetail"
                        />
                        <CardDetailDialog
                            v-if="entry.type === 'card'"
                            :visible="true"
                            :modal="true"
                            :oracleId="entry.oracleId"
                            :loadedCubes="loadedCubes"
                            :overviewTableData="overviewTableData"
                            @close="popDetail"
                        />
                    </template>
                </div>
            </el-main>
            <el-footer>
                <div style="text-align: center;">
                    <el-text tag="small">{{ getRandomFooter() }}</el-text>
                </div>
            </el-footer>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, provide, onMounted, nextTick } from 'vue';
import type { SortDirection } from './util/SortConfig';
import { stripSortTokens } from './util/SortConfig';
import { useHashRouter } from './util/useHashRouter';
import { useDebounceFn } from '@vueuse/core';
import { useDetailNavigation, suppressHashReconcile } from './util/useDetailNavigation';
import { ElMessage, ElNotification } from 'element-plus';
import type { PresetCollection } from './types';
import presetsJson from '../preloads/generated/presets.json';
const presetCollections: PresetCollection[] = presetsJson as PresetCollection[];
import { bindStorage } from './util/VueLocalStorage';
import type { UserCollection, Cube } from './types';
import { THEME_KEY } from 'vue-echarts';
import { getRandomFooter } from './util/RandomFooter';
import { initScryfall, remapCube, enrichCube, preloadSimiliarityMatrix, computeSimilarityMatrix, updateSimilarityForCube, removeSimilarityForCube } from './util/CubeFunctions';
import { getCubeData } from './util/CubeCobra';
import { snapshotKey, parseLoadedKey } from './util/Snapshots';
import { getCachedCube, setCachedCube, setCachedCubeIfNewer, isStale, pruneStaleEntries } from './util/CubeCache';
import { initFrequencyData } from './util/CubeCobraFrequency';
import { initCardStats } from './util/CubeCobraCardStats';
import { registerTheme } from 'echarts';
import darkbmjTheme from './echarts/theme';
import About from './components/About.vue';
import CubeDetailDialog from './components/CubeDetailDialog.vue';
import CardDetailDialog from './components/CardDetailDialog.vue';
import OverviewTab from './tabs/OverviewTab.vue';
import ArchetypeAnalysisTab from './tabs/ArchetypeAnalysisTab.vue';
import StatisticsTab from './tabs/StatisticsTab.vue';
import InfographicTab from './tabs/InfographicTab.vue';
import CardsTab from './tabs/CardsTab.vue';
import ComparisonTab from './tabs/ComparisonTab.vue';

registerTheme('darkbmj', darkbmjTheme);
provide(THEME_KEY, 'darkbmj');

// Track scryfall initialization promise
let scryfallInitPromise = null;

const ensureScryfallInitialized = async () => {
    if (scryfallInitPromise === null) {
        scryfallInitPromise = initScryfall();
    }
    return scryfallInitPromise;
};

// import.meta.glob captures only files that exist at build time, so the build
// succeeds even if a preload JSON hasn't been generated yet.
const cubeModules = import.meta.glob<{ default: any }>('../preloads/generated/cubes/*.json');
const similarityModules = import.meta.glob<{ default: any }>('../preloads/generated/similarities/*.json');

const availablePresets = new Set(
    presetCollections
        .filter(preset => `../preloads/generated/similarities/${preset.name}.json` in similarityModules)
        .map(preset => preset.label),
);

const loadedCubes = ref({});

const visibleLoadedCubes = computed(() =>
    Object.fromEntries(
        Object.entries(loadedCubes.value).filter(([, cube]: [string, any]) => !cube.hidden),
    ),
);

const hiddenLoadedCubes = computed(() =>
    Object.fromEntries(
        Object.entries(loadedCubes.value).filter(([, cube]: [string, any]) => cube.hidden),
    ),
);

const refreshingCubeIds = ref<Set<string>>(new Set());

// Loading progress for batch cube loads (addCubes)
const loadingProgress = reactive({ active: false, loaded: 0, total: 0 });

// Tracks which preset (by name) is currently loaded, so the URL can reflect
// ?preset=name instead of a long list of cube IDs.
const activePresetName = ref<string | null>(null);
// Stores the original set of cube IDs from the loaded preset, used to compute
// add/remove deltas for URL serialization.
const presetBaseIds = ref<Set<string>>(new Set());

const activePreset = computed(() => {
    if (!activePresetName.value) return null;
    return presetCollections.find(p => p.name === activePresetName.value) ?? null;
});

const activeTab = ref('overview');

const { stack: navigationStack, push: pushDetail, pop: popDetail, closeAll: closeAllDialogs } = useDetailNavigation();

const getCubeRow = (cubeId: string) => {
    return overviewTableData.value.find(c => c.id === cubeId) || null;
};
const getCubeCards = (cubeId: string) => {
    return loadedCubes.value[cubeId]?.cards || [];
};

const openCubeDetailDialog = (cubeId: string) => pushDetail({ type: 'cube', id: cubeId });
const openCardDetailDialog = (oracleId: string) => pushDetail({ type: 'card', oracleId });

provide('openCubeDetailDialog', openCubeDetailDialog);
provide('openCardDetailDialog', openCardDetailDialog);

const comparePair = ref<{ cubeAId: string; cubeBId: string } | null>(null);
const navigateToComparison = (cubeAId: string, cubeBId: string) => {
    closeAllDialogs();
    comparePair.value = { cubeAId, cubeBId };
    activeTab.value = 'compare';
};
provide('navigateToComparison', navigateToComparison);
provide('refreshingCubeIds', refreshingCubeIds);

const cardTableQuery = ref('');
provide('cardTableQuery', cardTableQuery);

const cardSortProp = ref('cubeCount');
const cardSortDirection = ref<SortDirection>('auto');
provide('cardSortProp', cardSortProp);
provide('cardSortDirection', cardSortDirection);

const showAllCards = ref(false);
provide('showAllCards', showAllCards);

const overviewSearchQuery = ref('');
const overviewSortProp = ref('name');
const overviewSortDirection = ref<SortDirection>('auto');
provide('overviewSearchQuery', overviewSearchQuery);
provide('overviewSortProp', overviewSortProp);
provide('overviewSortDirection', overviewSortDirection);

const { initialState: hashState, syncToHash, onHashChange } = useHashRouter();

const debouncedSync = useDebounceFn(() => {
    const currentQ = activeTab.value === 'cards'
        ? stripSortTokens(cardTableQuery.value)
        : activeTab.value === 'overview'
            ? stripSortTokens(overviewSearchQuery.value)
            : '';

    const currentSortProp = activeTab.value === 'cards'
        ? cardSortProp.value
        : activeTab.value === 'overview'
            ? overviewSortProp.value
            : null;

    const currentSortDir = activeTab.value === 'cards'
        ? cardSortDirection.value
        : activeTab.value === 'overview'
            ? overviewSortDirection.value
            : null;

    // Determine if sort values are non-default (skip serializing defaults)
    const defaultCardSort = 'cubeCount';
    const defaultOverviewSort = 'name';
    const isDefaultSort = activeTab.value === 'cards'
        ? currentSortProp === defaultCardSort && (currentSortDir === 'auto' || currentSortDir === 'descending')
        : activeTab.value === 'overview'
            ? currentSortProp === defaultOverviewSort && (currentSortDir === 'auto' || currentSortDir === 'ascending')
            : true;

    const directionValue = currentSortDir === 'ascending' ? 'asc' : currentSortDir === 'descending' ? 'desc' : null;

    syncToHash({
        tab: activeTab.value,
        preset: activePresetName.value,
        cubes: activePresetName.value ? [] : Object.keys(visibleLoadedCubes.value),
        hidden: Object.keys(hiddenLoadedCubes.value),
        presetAdd: activePresetName.value
            ? Object.keys(visibleLoadedCubes.value).filter(id => !presetBaseIds.value.has(id))
            : [],
        presetRemove: activePresetName.value
            ? [...presetBaseIds.value].filter(id => !(id in loadedCubes.value))
            : [],
        q: currentQ,
        order: isDefaultSort ? null : (currentSortProp || null),
        direction: isDefaultSort ? null : directionValue,
        compareA: activeTab.value === 'compare' && comparePair.value ? comparePair.value.cubeAId : null,
        compareB: activeTab.value === 'compare' && comparePair.value ? comparePair.value.cubeBId : null,
        allCards: activeTab.value === 'cards' && showAllCards.value,
    });
}, 100);

watch(
    [
        activeTab,
        () => Object.keys(visibleLoadedCubes.value).join(','),
        () => Object.keys(hiddenLoadedCubes.value).join(','),
        activePresetName,
        cardTableQuery,
        cardSortProp,
        cardSortDirection,
        overviewSearchQuery,
        overviewSortProp,
        overviewSortDirection,
        comparePair,
        showAllCards,
    ],
    () => { debouncedSync(); },
);

onHashChange(async (newState) => {
    // If a dialog close just reverted the URL via history.back/go, the URL no
    // longer matches loadedCubes (e.g. snapshots added inside the dialog).
    // Skip reconciliation and re-sync the URL from current state instead.
    if (suppressHashReconcile.value) {
        suppressHashReconcile.value = false;
        debouncedSync();
        return;
    }

    // Update tab
    if (newState.tab !== activeTab.value) {
        activeTab.value = newState.tab;
    }

    // Update sort/query for the target tab
    if (newState.tab === 'cards') {
        cardTableQuery.value = newState.q;
        if (newState.order) cardSortProp.value = newState.order;
        if (newState.direction) cardSortDirection.value = newState.direction === 'asc' ? 'ascending' : 'descending';
    } else if (newState.tab === 'overview') {
        overviewSearchQuery.value = newState.q;
        if (newState.order) overviewSortProp.value = newState.order;
        if (newState.direction) overviewSortDirection.value = newState.direction === 'asc' ? 'ascending' : 'descending';
    }

    showAllCards.value = newState.allCards;

    // Update compare pair if on compare tab
    if (newState.tab === 'compare' && newState.compareA && newState.compareB) {
        if (!loadedCubes.value[newState.compareA]) addAny(newState.compareA);
        if (!loadedCubes.value[newState.compareB]) addAny(newState.compareB);
        comparePair.value = { cubeAId: newState.compareA, cubeBId: newState.compareB };
    }

    // Reconcile cube state only if it actually changed
    const currentIds = Object.keys(loadedCubes.value).sort().join(',');
    const newIds = [...newState.cubes].sort().join(',');
    const currentPreset = activePresetName.value;

    if (newState.preset && newState.preset !== currentPreset) {
        const preset = presetCollections.find(p => p.name === newState.preset);
        if (preset && availablePresets.has(preset.label)) {
            await loadCollection(preset.label);
            // Apply add/remove deltas on top of the freshly loaded preset
            if (newState.presetRemove.length > 0) {
                for (const id of newState.presetRemove) {
                    delete loadedCubes.value[id];
                    removeSimilarityForCube(id, similarityMatrix.value);
                }
            }
            if (newState.presetAdd.length > 0) {
                await addCubes(newState.presetAdd);
            }
        }
    } else if (!newState.preset) {
        const allNewIds = [...newState.cubes, ...newState.hidden];
        const newIdSet = new Set(allNewIds);
        const currentIdSet = new Set(Object.keys(loadedCubes.value));

        if (allNewIds.length === 0 && currentIdSet.size > 0) {
            clearCubes();
        } else {
            // Add missing cubes, remove extras
            for (const id of currentIdSet) {
                if (!newIdSet.has(id)) removeCube(id);
            }
            const toAdd = allNewIds.filter(id => !currentIdSet.has(id));
            if (toAdd.length > 0) await addCubes(toAdd);
        }

        // Apply / clear hidden flag after loads resolve
        const hiddenSet = new Set(newState.hidden);
        for (const id of Object.keys(loadedCubes.value)) {
            const shouldHide = hiddenSet.has(id);
            const current = loadedCubes.value[id];
            if (current && !!current.hidden !== shouldHide) {
                loadedCubes.value[id] = { ...current, hidden: shouldHide };
            }
        }
    }
});

const presetComparisonsSelect = ref([...availablePresets].map(label => ({ label, value: label })));

const userCollections = bindStorage<UserCollection[]>('user-collections', v => Array.isArray(v) ? v : []);

const similarityMatrix = ref<Record<string, Record<string, import('./types').SimilarityScore>>>({});

const getAverageSimilarityScore = (cubeId: string) => {
    const scores = similarityMatrix.value[cubeId] || {};
    const totalCubes = Object.keys(visibleLoadedCubes.value).length - 1;

    if (totalCubes === 0) {
        return 0;
    }

    const totalScore = Object.values(scores).reduce((acc, c) => acc + c.cosineSimilarity, 0);
    return totalScore / totalCubes;
};

// FIXME: Is there a way to indicate that this should wait until after similarityMatrix is recomputed?
const overviewTableData = computed(() => {
    return Object.entries(visibleLoadedCubes.value).map(([id, cube]) => {
        return {
            ...cube,
            // Strip cards from the table object to improve render performance.
            // This seems to save ~500ms for ~50 cubes (600ms vs 100ms), and ~1200ms for ~100 cubes (1400ms vs 200ms).
            // There might be even more to strip from this object to shave a few more ms.
            cards: undefined,
            suffixedCardIds: undefined,
            avgSimilarityScore: getAverageSimilarityScore(id),
        }
    });
});

const peerStats = computed(() => {
    const cubes = overviewTableData.value;
    if (cubes.length <= 1) return null;

    const ms = (values: number[]) => {
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const stddev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
        return { mean, stddev };
    };

    const ratio = (getter: (c: typeof cubes[number]) => number) =>
        cubes.map(c => getter(c) / (c.stats?.totalCards || 1));

    return {
        newCardRatio:               ms(ratio(c => c.stats?.newCards ?? 0)),
        landRatio:                  ms(ratio(c => c.stats?.landCards ?? 0)),
        creatureRatio:              ms(ratio(c => c.stats?.creatureCards ?? 0)),
        removalRatio:               ms(ratio(c => c.stats?.cardCounts?.removal ?? 0)),
        makesTokensRatio:           ms(ratio(c => c.stats?.cardCounts?.makesTokens ?? 0)),
        abnormalLayoutRatio:        ms(ratio(c => c.stats?.cardCounts?.abnormalLayout ?? 0)),
        universesBeyondRatio:       ms(ratio(c => c.stats?.cardCounts?.universesBeyond ?? 0)),
        supplementalProductRatio:   ms(ratio(c => c.stats?.cardCounts?.supplementalProduct ?? 0)),
        uniqueTokenCount:           ms(ratio(c => c.stats?.uniqueTokenCount ?? 0)),
        avgSimilarityScore:         ms(cubes.map(c => c.avgSimilarityScore ?? 0)),
        averageNonLandCmc:          ms(cubes.map(c => c.stats?.averageNonLandCmc ?? 0)),
        averageElo:                 ms(cubes.map(c => c.stats?.averageElo ?? 0)),
        averagePopularity:          ms(cubes.map(c => c.stats?.averagePopularity ?? 0)),
        blendedRarityScore:         ms(cubes.map(c => c.stats?.blendedRarityScore ?? 0)),
        averageReleaseYear:         ms(cubes.map(c => c.stats?.averageReleaseYear ?? 0)),
        medianReleaseYear:          ms(cubes.map(c => c.stats?.medianReleaseYear ?? 0)),
        averageWordCount:           ms(cubes.map(c => c.stats?.averageWordCount ?? 0)),
        averageWordCountUnique:     ms(cubes.map(c => c.stats?.averageWordCountUnique ?? 0)),
        uniqueKeywords:             ms(ratio(c => c.stats?.uniqueKeywords ?? 0)),
        uniqueNonEvergreenKeywords: ms(ratio(c => c.stats?.uniqueNonEvergreenKeywords ?? 0)),
    };
});

const backgroundRefreshCube = async (id: string) => {
    if (refreshingCubeIds.value.has(id)) return;
    refreshingCubeIds.value = new Set([...refreshingCubeIds.value, id]);
    try {
        const rawCube = await getCubeData(id);
        await ensureScryfallInitialized();
        const fetchedAt = new Date().toISOString();
        const strippedCube = remapCube(rawCube, false, fetchedAt);
        await setCachedCube(strippedCube.id, strippedCube, fetchedAt);
        const enrichedCube = enrichCube(strippedCube);
        loadedCubes.value[enrichedCube.id] = enrichedCube;
        updateSimilarityForCube(enrichedCube.id, loadedCubes.value, similarityMatrix.value);
    } catch (e) {
        console.error(`Background refresh failed for cube: ${id}`, e);
    } finally {
        const next = new Set(refreshingCubeIds.value);
        next.delete(id);
        refreshingCubeIds.value = next;
    }
};

const addCubes = async (cubeIds: string[]) => {
    if (presetBaseIds.value.size === 0) {
        activePresetName.value = null;
    }
    loadingProgress.active = true;
    loadingProgress.total = cubeIds.length;
    loadingProgress.loaded = 0;
    const queue = [...cubeIds];
    const worker = async () => {
        while (queue.length > 0) {
            const id = queue.shift()!;
            try {
                const { snapshotDate } = parseLoadedKey(id);
                if (snapshotDate != null) {
                    await addAny(id);
                } else {
                    // existing live-cube logic unchanged
                    const cached = await getCachedCube(id);
                    if (cached) {
                        await ensureScryfallInitialized();
                        const enrichedCube = enrichCube(cached.data);
                        loadedCubes.value[enrichedCube.id] = enrichedCube;
                        if (isStale(cached)) {
                            backgroundRefreshCube(cached.id);
                        }
                    } else {
                        const rawCube = await getCubeData(id);
                        await ensureScryfallInitialized();
                        const fetchedAt = new Date().toISOString();
                        const strippedCube = remapCube(rawCube, false, fetchedAt);
                        await setCachedCube(strippedCube.id, strippedCube, fetchedAt);
                        const enrichedCube = enrichCube(strippedCube);
                        loadedCubes.value[enrichedCube.id] = enrichedCube;
                    }
                }
                await nextTick();
            } catch (e) {
                console.error(`Error loading cube: ${id}`, e);
                ElMessage({ message: `Failed to load cube: ${id}`, type: 'error', duration: 4000 });
            } finally {
                loadingProgress.loaded += 1;
            }
        }
    };
    await Promise.all(Array.from({ length: 2 }, worker));
    // Compute full matrix after batch add completes
    similarityMatrix.value = computeSimilarityMatrix(loadedCubes.value);
    loadingProgress.active = false;
};

const saveCollection = (name: string) => {
    const cubeIds = Object.keys(visibleLoadedCubes.value);
    const existing = userCollections.value.findIndex(c => c.name === name);
    if (existing >= 0) {
        userCollections.value[existing] = { name, cubeIds };
    } else {
        userCollections.value = [...userCollections.value, { name, cubeIds }];
    }
};

const loadUserCollection = async (name: string) => {
    const collection = userCollections.value.find(c => c.name === name);
    if (!collection) return;
    loadedCubes.value = {};
    await addCubes(collection.cubeIds);
};

const removeCollection = (name: string) => {
    userCollections.value = userCollections.value.filter(c => c.name !== name);
};

const addSnapshot = async (
    baseCubeId: string,
    requestedDate: number,
    options: { hidden?: boolean } = {},
): Promise<{ key: string; deduped: boolean } | null> => {
    // Optimization: if the requestedDate exactly matches a previously-cached
    // composite key (URL recovery for a snapshot loaded in a past session),
    // skip the network round-trip entirely.
    const optimisticKey = snapshotKey(baseCubeId, requestedDate);
    const cachedOptimistic = await getCachedCube(optimisticKey);
    if (cachedOptimistic) {
        await ensureScryfallInitialized();
        const enriched = enrichCube(cachedOptimistic.data);
        if (presetBaseIds.value.size === 0) {
            activePresetName.value = null;
        }
        loadedCubes.value[optimisticKey] = enriched;
        if (options.hidden) {
            loadedCubes.value[optimisticKey] = { ...loadedCubes.value[optimisticKey], hidden: true };
        }
        updateSimilarityForCube(optimisticKey, loadedCubes.value, similarityMatrix.value);
        return { key: optimisticKey, deduped: false };
    }

    let raw;
    try {
        raw = await getCubeData(baseCubeId, { date: requestedDate });
    } catch (e) {
        console.error(`Failed to load snapshot for ${baseCubeId}:`, e);
        ElMessage({ message: `Failed to load snapshot for ${baseCubeId}`, type: 'error', duration: 4000 });
        return null;
    }

    const changelogDate: number = raw.changelog.date;
    const key = snapshotKey(baseCubeId, changelogDate);

    if (loadedCubes.value[key]) {
        ElMessage({ message: 'Snapshot already loaded', type: 'info', duration: 3000 });
        return { key, deduped: true };
    }

    const cached = await getCachedCube(key);
    if (cached) {
        await ensureScryfallInitialized();
        const enriched = enrichCube(cached.data);
        if (presetBaseIds.value.size === 0) {
            activePresetName.value = null;
        }
        loadedCubes.value[key] = enriched;
        if (options.hidden) {
            loadedCubes.value[key] = { ...loadedCubes.value[key], hidden: true };
        }
        updateSimilarityForCube(key, loadedCubes.value, similarityMatrix.value);
        return { key, deduped: false };
    }

    await ensureScryfallInitialized();
    const fetchedAt = new Date().toISOString();
    const stripped = remapCube(raw, false, fetchedAt, { snapshotDate: changelogDate });
    await setCachedCube(key, stripped, fetchedAt);
    const enriched = enrichCube(stripped);

    if (presetBaseIds.value.size === 0) {
        activePresetName.value = null;
    }
    loadedCubes.value[key] = enriched;
    if (options.hidden) {
        loadedCubes.value[key] = { ...loadedCubes.value[key], hidden: true };
    }
    updateSimilarityForCube(key, loadedCubes.value, similarityMatrix.value);
    return { key, deduped: false };
};

const addAny = async (key: string): Promise<void> => {
    const { baseCubeId, snapshotDate } = parseLoadedKey(key);
    if (snapshotDate != null) {
        await addSnapshot(baseCubeId, snapshotDate);
    } else {
        await addCube(key);
    }
};

const addCube = async (cubeId: string, { refresh = false, hidden = false }: { refresh?: boolean; hidden?: boolean } = {}) => {
    // Attempt to take just the Cube ID based on multiple possible input formats.
    const input = cubeId.split('?')[0].trim();
    const [ id ] = input.match(/([^\/]+)\/?$/);

    // If the cube is already loaded, skip it.
    if (!Object.values(loadedCubes.value).some(cube => cube.id === id || cube.shortId === id)) {
        console.time(`Add Cube: ${id}`);
        try {
            const cached = await getCachedCube(id);
            if (cached) {
                await ensureScryfallInitialized();
                const enrichedCube = enrichCube(cached.data);
                if (presetBaseIds.value.size === 0) {
                    activePresetName.value = null;
                }
                loadedCubes.value[enrichedCube.id] = enrichedCube;
                if (hidden) {
                    loadedCubes.value[enrichedCube.id] = { ...loadedCubes.value[enrichedCube.id], hidden: true };
                }
                updateSimilarityForCube(enrichedCube.id, loadedCubes.value, similarityMatrix.value);
                if (refresh || isStale(cached)) {
                    backgroundRefreshCube(cached.id);
                }
            } else {
                const rawCube = await getCubeData(id);
                await ensureScryfallInitialized();
                const fetchedAt = new Date().toISOString();
                const strippedCube = remapCube(rawCube, false, fetchedAt);
                await setCachedCube(strippedCube.id, strippedCube, fetchedAt);
                const enrichedCube = enrichCube(strippedCube);
                if (presetBaseIds.value.size === 0) {
                    activePresetName.value = null;
                }
                loadedCubes.value[enrichedCube.id] = enrichedCube;
                if (hidden) {
                    loadedCubes.value[enrichedCube.id] = { ...loadedCubes.value[enrichedCube.id], hidden: true };
                }
                updateSimilarityForCube(enrichedCube.id, loadedCubes.value, similarityMatrix.value);
            }
        } catch (e) {
            console.error("Error loading cube:", e);
            ElMessage({ message: `Failed to load cube: ${id}`, type: 'error', duration: 4000 });
        }
        await nextTick();
        console.timeEnd(`Add Cube: ${id}`);
    }
};

const loadCollection = async (presetName: string) => {
    if (!availablePresets.has(presetName)) return;

    const preset = presetCollections.find(p => p.label === presetName);
    if (!preset) return;

    console.time(`Render Collection: ${presetName}`);
    console.time(`Load Collection: ${presetName}`);

    const cubeEntries = Object.entries(preset.cubes);
    loadingProgress.active = true;
    loadingProgress.total = cubeEntries.length;
    loadingProgress.loaded = 0;

    try {
        await ensureScryfallInitialized();

        // Load each cube: IndexedDB → preload file → CubeCobra fallback
        const results = await Promise.all(cubeEntries.map(async ([id, meta]) => {
            try {
                // Tier 1: IndexedDB (if newer than preload)
                const cached = await getCachedCube(id);
                if (cached && cached.fetchedAt >= meta.fetchedAt) {
                    return enrichCube(cached.data);
                }

                // Tier 2: Preload file
                const cubeKey = `../preloads/generated/cubes/${id}.json`;
                if (cubeKey in cubeModules) {
                    const mod = await cubeModules[cubeKey]();
                    const cube: Cube = mod.default;
                    setCachedCubeIfNewer(id, cube, cube.fetchedAt ?? meta.fetchedAt);
                    return enrichCube(cube);
                }

                // Tier 3: Live fetch (fallback)
                const raw = await getCubeData(id);
                const fetchedAt = new Date().toISOString();
                const cube = remapCube(raw, false, fetchedAt);
                await setCachedCube(id, cube, fetchedAt);
                return enrichCube(cube);
            } catch (e) {
                console.error(`[${id}] Failed to load cube:`, e);
                return null;
            } finally {
                loadingProgress.loaded++;
            }
        }));

        const enrichedCubes = Object.fromEntries(
            results.filter((c): c is Cube => c !== null).map(c => [c.id, c]),
        );

        // Load similarity matrix (after cubes are available for versioned cache keys)
        const simKey = `../preloads/generated/similarities/${preset.name}.json`;
        if (simKey in similarityModules) {
            const simModule = await similarityModules[simKey]();
            preloadSimiliarityMatrix(simModule.default, enrichedCubes);
        }

        console.timeEnd(`Load Collection: ${presetName}`);

        // Set the active preset BEFORE updating loadedCubes so the URL watcher
        // writes ?preset=name rather than serializing the cube IDs.
        activePresetName.value = preset.name;
        presetBaseIds.value = new Set(Object.keys(enrichedCubes));
        loadedCubes.value = enrichedCubes;
        similarityMatrix.value = computeSimilarityMatrix(loadedCubes.value);
        await nextTick();
    } finally {
        loadingProgress.active = false;
    }

    console.timeEnd(`Render Collection: ${presetName}`);
};

/**
 * FIXME: Make this betterer.
 *  Doing a terrible job currently with these multiple IDs, and I think mutating the reactive object is done improperly.
 */
const removeCube = (cubeId: string) => {
    if (presetBaseIds.value.size === 0) {
        activePresetName.value = null;
    }
    delete loadedCubes.value[cubeId];
    removeSimilarityForCube(cubeId, similarityMatrix.value);
};

const clearCubes = () => {
    activePresetName.value = null;
    presetBaseIds.value = new Set();
    loadedCubes.value = {};
    similarityMatrix.value = {};
};

const refreshCube = async (id: string) => {
    await backgroundRefreshCube(id);
};
provide('refreshCube', refreshCube);
provide('addCube', addCube);
provide('addSnapshot', addSnapshot);
provide('removeCube', removeCube);

onMounted(async () => {
    // Start data initialization in the background without blocking the UI
    ensureScryfallInitialized();
    pruneStaleEntries();
    initFrequencyData();
    initCardStats();

    // Apply initial state from URL hash
    activeTab.value = hashState.tab;

    // Apply sort/query state for the active tab
    if (hashState.tab === 'cards') {
        cardTableQuery.value = hashState.q;
        if (hashState.order) cardSortProp.value = hashState.order;
        if (hashState.direction) cardSortDirection.value = hashState.direction === 'asc' ? 'ascending' : 'descending';
    } else if (hashState.tab === 'overview') {
        overviewSearchQuery.value = hashState.q;
        if (hashState.order) overviewSortProp.value = hashState.order;
        if (hashState.direction) overviewSortDirection.value = hashState.direction === 'asc' ? 'ascending' : 'descending';
    }

    showAllCards.value = hashState.allCards;

    // Load cubes from URL
    if (hashState.preset) {
        const preset = presetCollections.find(p => p.name === hashState.preset);
        if (preset && availablePresets.has(preset.label)) {
            await loadCollection(preset.label);
            // Apply add/remove deltas on top of the preset
            if (hashState.presetRemove.length > 0) {
                for (const id of hashState.presetRemove) {
                    delete loadedCubes.value[id];
                    removeSimilarityForCube(id, similarityMatrix.value);
                }
            }
            if (hashState.presetAdd.length > 0) {
                await addCubes(hashState.presetAdd);
            }
            if (hashState.hidden.length > 0) {
                await addCubes(hashState.hidden);
                const hiddenSet = new Set(hashState.hidden);
                for (const id of Object.keys(loadedCubes.value)) {
                    if (hiddenSet.has(id)) {
                        loadedCubes.value[id] = { ...loadedCubes.value[id], hidden: true };
                    }
                }
            }
        }
    } else if (hashState.cubes.length > 0 || hashState.hidden.length > 0) {
        await addCubes([...hashState.cubes, ...hashState.hidden]);

        const hiddenSet = new Set(hashState.hidden);
        for (const id of Object.keys(loadedCubes.value)) {
            if (hiddenSet.has(id)) {
                loadedCubes.value[id] = { ...loadedCubes.value[id], hidden: true };
            }
        }

        // Show a non-blocking hint only if the loaded set isn't already saved
        const loadedIds = Object.keys(loadedCubes.value);
        const alreadySaved = userCollections.value.some(col => {
            const savedSet = new Set(col.cubeIds);
            return savedSet.size === loadedIds.length && loadedIds.every(id => savedSet.has(id));
        });
        if (!alreadySaved && loadedIds.length > 0) {
            ElNotification({
                type: 'info',
                title: 'Share link loaded',
                message: `${loadedIds.length} cube${loadedIds.length !== 1 ? 's' : ''} loaded. Use \"Save As…\" to keep this collection.`,
                duration: 6000,
                position: 'bottom-right',
            });
        }
    }

    // Set compare pair from URL if on compare tab
    if (hashState.tab === 'compare' && hashState.compareA && hashState.compareB) {
        if (!loadedCubes.value[hashState.compareA]) await addAny(hashState.compareA);
        if (!loadedCubes.value[hashState.compareB]) await addAny(hashState.compareB);
        comparePair.value = { cubeAId: hashState.compareA, cubeBId: hashState.compareB };
    }
});
</script>

<style lang="scss">
html.dark {
    --el-color-primary: #5755d9;

    --el-color-primary-light-3: #4b48d6;
    --el-color-primary-light-5: #4b48d6;
    --el-color-primary-light-7: #4b48d6;
    --el-color-primary-light-8: #514fea;
    --el-color-primary-light-9: #514fea;

    --el-color-primary-dark-2: #514fea;
    --el-color-primary-dark-3: #514fea;
    --el-color-primary-dark-5: #4b48d6;
    --el-color-primary-dark-7: #4b48d6;
    --el-color-primary-dark-8: #3f3db6;
    --el-color-primary-dark-9: #3f3db6;

    --el-dropdown-menuItem-hover-fill: rgba(255, 255, 255, 0.08);
    --el-dropdown-menuItem-hover-color: var(--el-text-color-primary);
}

html.dark .el-dropdown,
html.dark .el-dropdown__popper {
    --el-dropdown-menuItem-hover-fill: rgba(255, 255, 255, 0.08);
    --el-dropdown-menuItem-hover-color: var(--el-text-color-primary);
}

.el-button:hover {
    color: var(--el-text-color-primary);
}

.el-header {
    padding-top: 0.8em;
    padding-bottom: 0.8em;
    height: unset;

    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color);

    a {
        text-decoration: none;
        color: var(--el-text-color-secondary);

        &:hover {
            color: var(--el-color-primary);
        }
    }
}

.el-main {
    padding-top: 5px;
    overflow: visible;
}

.el-tabs__content {
    overflow: visible;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.header-links {
    display: flex;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;

    svg {
        display: block;
    }
}

@media (max-width: 480px) {
    .header-links {
        display: none;
    }
}

@media (max-width: 360px) {
    .header-page-title {
        display: none;
    }
}

html {
    scrollbar-gutter: stable;
}

body {
    font-family: Helvetica Neue,Helvetica,PingFang SC,Hiragino Sans GB,Microsoft YaHei,微软雅黑,Arial,sans-serif;
    font-weight: 400;
    font-size: 14px;

    margin: 0px auto;
}

.el-table .cell {
    line-height: 20px;
}

td.el-table__cell.el-table__expanded-cell > div.el-row {
    max-width: 95vw;
}

.el-select-group__title {
    padding: 0 10px;
}

.chart-row {
    x-vue-echarts.chart {
        width: unset;
        margin: 0 auto;
    }
}

.remove-button {
    position: absolute;
    visibility: hidden;
    top: 20%;
    right: 25%;
    width: 50%;
    height: 50%;
}

.remove-thumbnail:hover + .remove-button, .remove-button:hover {
    visibility: visible;
}

.text-center,[text~=center] {
    text-align: center
}

.cell-secondary {
    color: var(--el-text-color-secondary);
    margin-left: 0.5em;
}

.tag-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

@media (max-width: 760px) {
    .el-tabs__nav-prev,
    .el-tabs__nav-next {
        display: none !important;
    }

    .el-tabs__nav-wrap {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .el-tabs__nav-wrap::-webkit-scrollbar {
        display: none;
    }

    .el-tabs__nav-wrap::after {
        display: none !important;
    }

    .el-tabs__nav-scroll {
        width: max-content;
    }

    .el-header {
        padding-left: 5px;
        padding-right: 5px;
    }

    .el-main {
        padding-left: 5px;
        padding-right: 5px;
    }
}

@media (hover: none), (pointer: coarse) {
    .el-popper[role="tooltip"]:not(:has(.el-select-dropdown)):not(:has(.el-dropdown-menu)):not(:has(.el-color-dropdown)):not(.el-popover) {
        display: none !important;
    }
}
</style>

<style>
.el-popper.card-tooltip {
    padding: 6px 8px;
    width: 250px;
    height: 350px;
}

.el-popper.card-tooltip .card-image {
    width: 100%;
    height: auto;
    border-radius: 4.75% / 3.5%;
}

.el-popper.card-tooltip .card-image.lea {
    border-radius: 7% / 5.5%;
}

.el-descriptions__table.is-bordered tr:nth-child(even) .is-bordered-label {
    background: var(--el-fill-color);
}

.el-descriptions__table.is-bordered tr:nth-child(even) .is-bordered-content {
    background: var(--el-fill-color-lighter);
}

@media (max-width: 760px) {
    .el-dialog {
        --el-dialog-width: 100% !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        max-height: 100dvh;
        display: flex;
        flex-direction: column;
    }

    .el-dialog .el-dialog__body {
        overflow: auto;
        flex: 1;
        min-height: 0;
    }
}
</style>
