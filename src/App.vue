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
                            />
                        </el-tab-pane>

                        <el-tab-pane label="Infographic" name="infographic" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <InfographicTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane>

                        <el-tab-pane label="Statistics" name="statistics" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <StatisticsTab :loadedCubes="overviewTableData" />
                        </el-tab-pane>

                        <!-- <el-tab-pane label="Themes" name="archetypes" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <ArchetypeAnalysisTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane> -->

                        <el-tab-pane label="Cards" name="cards" :lazy="true">
                            <CardsTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane>

                        <el-tab-pane label="About" name="about" :lazy="true">
                            <About />
                        </el-tab-pane>
                    </el-tabs>

                    <template v-for="(entry, index) in navigationStack" :key="entry.key">
                        <CubeDetailDialog
                            v-if="entry.type === 'cube'"
                            v-show="index === navigationStack.length - 1"
                            :visible="true"
                            :modal="index === navigationStack.length - 1"
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
                            v-show="index === navigationStack.length - 1"
                            :visible="true"
                            :modal="index === navigationStack.length - 1"
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
import { useDetailNavigation } from './util/useDetailNavigation';
import { ElMessage, ElNotification } from 'element-plus';
import { presetCollections } from './presets';
import { bindStorage } from './util/VueLocalStorage';
import type { UserCollection } from './types';
import { THEME_KEY } from 'vue-echarts';
import { getRandomFooter } from './util/RandomFooter';
import { initScryfall, remapCube, enrichCube, preloadSimiliarityMatrix, computeSimilarityMatrix } from './util/CubeFunctions';
import { getCubeData } from './util/CubeCobra';
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
const availablePreloadModules = import.meta.glob<{ default: any }>('../preloads/cubes-*.json');

const presetComparisons = Object.fromEntries(
    presetCollections
        .filter(preset => `../preloads/cubes-${preset.name}.json` in availablePreloadModules)
        .map(preset => [preset.label, availablePreloadModules[`../preloads/cubes-${preset.name}.json`]]),
);

const loadedCubes = ref({});

// Loading progress for batch cube loads (addCubes)
const loadingProgress = reactive({ active: false, loaded: 0, total: 0 });

// Tracks which preset (by name) is currently loaded, so the URL can reflect
// ?preset=name instead of a long list of cube IDs.
const activePresetName = ref<string | null>(null);

// Auto-sync the URL with the currently loaded state so the address bar is
// always a valid share link. Fires whenever any cube is added or removed.
watch(
    () => Object.keys(loadedCubes.value).join(','),
    (ids) => {
        if (!ids) {
            history.replaceState(null, '', window.location.pathname);
        } else if (activePresetName.value) {
            const params = new URLSearchParams({ preset: activePresetName.value });
            history.replaceState(null, '', `?${params.toString()}`);
        } else {
            const params = new URLSearchParams({ cubes: ids });
            history.replaceState(null, '', `?${params.toString()}`);
        }
    },
);

const activeTab = ref('overview');

const { stack: navigationStack, push: pushDetail, pop: popDetail } = useDetailNavigation();

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

const cardTableQuery = ref('');
provide('cardTableQuery', cardTableQuery);

const presetComparisonsSelect = ref(presetComparisons ? Object.keys(presetComparisons).map(key => ({ label: key, value: key })) : []);

const userCollections = bindStorage<UserCollection[]>('user-collections', v => Array.isArray(v) ? v : []);

// FIXME: Still getting a double render on this for some reason, but the memoization is absorbing the hit.
const similarityMatrix = computed(() => {
    return computeSimilarityMatrix(loadedCubes.value);
});

const getAverageSimilarityScore = (cubeId: string) => {
    const scores = similarityMatrix.value[cubeId] || {};
    const totalCubes = Object.keys(loadedCubes.value).length - 1;

    if (totalCubes === 0) {
        return 0;
    }

    const totalScore = Object.values(scores).reduce((acc, c) => acc + c.cosineSimilarity, 0);
    return totalScore / totalCubes;
};

// FIXME: Is there a way to indicate that this should wait until after similarityMatrix is recomputed?
const overviewTableData = computed(() => {
    return Object.entries(loadedCubes.value).map(([id, cube]) => {
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

const addCubes = async (cubeIds: string[]) => {
    activePresetName.value = null;
    loadingProgress.active = true;
    loadingProgress.total = cubeIds.length;
    loadingProgress.loaded = 0;
    const queue = [...cubeIds];
    const worker = async () => {
        while (queue.length > 0) {
            const id = queue.shift()!;
            try {
                // Fetch from CubeCobra immediately — no Scryfall dependency yet.
                const rawCube = await getCubeData(id);
                // Scryfall must be ready before enrichment; await here so the
                // network round-trip above can overlap with Scryfall initializing.
                await ensureScryfallInitialized();
                const enrichedCube = remapCube(rawCube, true, new Date().toISOString());
                loadedCubes.value[enrichedCube.id] = enrichedCube;
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
    loadingProgress.active = false;
};

const saveCollection = (name: string) => {
    const cubeIds = Object.keys(loadedCubes.value);
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

const addCube = async (cubeId: string) => {
    // Attempt to take just the Cube ID based on multiple possible input formats.
    const input = cubeId.split('?')[0].trim();
    const [ id ] = input.match(/([^\/]+)\/?$/);

    // If the cube is already loaded, skip it.
    if (!Object.values(loadedCubes.value).some(cube => cube.id === id || cube.shortId === id)) {
        console.time(`Add Cube: ${id}`);
        try {
            // Fetch from CubeCobra immediately — no Scryfall dependency yet.
            const rawCube = await getCubeData(id);
            // Scryfall must be ready before enrichment; await here so the
            // network round-trip above can overlap with Scryfall initializing.
            await ensureScryfallInitialized();
            const enrichedCube = remapCube(rawCube, true, new Date().toISOString());
            activePresetName.value = null;
            loadedCubes.value[enrichedCube.id] = enrichedCube;
        } catch (e) {
            console.error("Error loading cube:", e);
            ElMessage({ message: `Failed to load cube: ${id}`, type: 'error', duration: 4000 });
        }
        await nextTick();
        console.timeEnd(`Add Cube: ${id}`);
    }
};

const loadCollection = async (presetName: string) => {
    if (presetName in presetComparisons) {
        console.time(`Render Collection: ${presetName}`);
        console.time(`Load Collection: ${presetName}`);

        loadingProgress.active = true;
        loadingProgress.total = 1;
        loadingProgress.loaded = 0;

        try {
            await ensureScryfallInitialized();

            const cubesModule = await presetComparisons[presetName]();
            preloadSimiliarityMatrix(cubesModule.default.similarities);
            const enrichedCubes = Object.fromEntries(Object.entries(cubesModule.default.cubes).map(([id, cube]) => [id, enrichCube(cube)]));

            console.timeEnd(`Load Collection: ${presetName}`);
            // Set the active preset BEFORE updating loadedCubes so the URL watcher
            // writes ?preset=name rather than serializing the cube IDs.
            activePresetName.value = presetCollections.find(p => p.label === presetName)?.name ?? null;
            loadedCubes.value = enrichedCubes;
            loadingProgress.loaded = 1;
            await nextTick();
        } finally {
            loadingProgress.active = false;
        }

        console.timeEnd(`Render Collection: ${presetName}`);
    }
};

/**
 * FIXME: Make this betterer.
 *  Doing a terrible job currently with these multiple IDs, and I think mutating the reactive object is done improperly.
 */
const removeCube = (cubeId: string) => {
    activePresetName.value = null;
    delete loadedCubes.value[cubeId];
};

const clearCubes = () => {
    activePresetName.value = null;
    loadedCubes.value = {};
};

onMounted(async () => {
    // Start data initialization in the background without blocking the UI
    ensureScryfallInitialized();
    initFrequencyData();
    initCardStats();

    // Load cubes or a preset collection from URL query parameters (share links).
    // The URL watcher above keeps the address bar in sync from this point forward,
    // so no manual history.replaceState is needed here.
    const params = new URLSearchParams(window.location.search);
    const presetParam = params.get('preset');
    const cubesParam = params.get('cubes');

    if (presetParam) {
        const preset = presetCollections.find(p => p.name === presetParam);
        if (preset && preset.label in presetComparisons) {
            await loadCollection(preset.label);
        }
    } else if (cubesParam) {
        const ids = cubesParam.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length > 0) {
            await addCubes(ids);

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
                    message: `${loadedIds.length} cube${loadedIds.length !== 1 ? 's' : ''} loaded. Use "Save As…" to keep this collection.`,
                    duration: 6000,
                    position: 'bottom-right',
                });
            }
        }
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

body {
    font-family: Inter,Helvetica Neue,Helvetica,PingFang SC,Hiragino Sans GB,Microsoft YaHei,微软雅黑,Arial,sans-serif;
    font-weight: 350;
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
