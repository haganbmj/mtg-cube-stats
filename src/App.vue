<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <el-row :gutter="20">
                    <el-col :span="16">
                        <el-breadcrumb separator=" / ">
                            <el-breadcrumb-item>
                                <a href="https://griselbrand.com">griselbrand.com</a>
                            </el-breadcrumb-item>
                            <el-breadcrumb-item>Cube Comparison</el-breadcrumb-item>
                        </el-breadcrumb>
                    </el-col>
                    <el-col :span="8">
                        <div style="justify-content: flex-end; display: flex;">
                            <a href="https://bsky.app/profile/griselbrand.com" target="_blank">Bluesky</a>
                            <el-divider direction="vertical" />
                            <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank">Github</a>
                        </div>
                    </el-col>
                </el-row>
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
                                :loadCollection="loadCollection"
                            />
                        </el-tab-pane>

                        <el-tab-pane label="Infographic" name="infographic" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <InfographicTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane>

                        <el-tab-pane label="Statistics" name="statistics" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <StatisticsTab :loadedCubes="overviewTableData" />
                        </el-tab-pane>

                        <el-tab-pane label="Themes" name="archetypes" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <ArchetypeAnalysisTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane>

                        <el-tab-pane label="Cards" name="cards" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <CardsTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" :overviewTableData="overviewTableData" />
                        </el-tab-pane>

                        <el-tab-pane label="About" name="about" :lazy="true">
                            <About />
                        </el-tab-pane>
                    </el-tabs>

                    <CubeDetailDialog
                        v-model:visible="cubeDetailDialogVisible"
                        :cubeRow="cubeDetailDialogRow"
                        :cubeCards="cubeDetailDialogCards"
                        :similarityMatrix="similarityMatrix"
                        :overviewTableData="overviewTableData"
                        :loadedCubes="loadedCubes"
                    />
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
import { ref, computed, provide, onMounted, nextTick } from 'vue';
import { THEME_KEY } from 'vue-echarts';
import { getRandomFooter } from './util/RandomFooter';
import { initScryfall, remapCube, enrichCube, preloadSimiliarityMatrix, computeSimilarityMatrix } from './util/CubeFunctions';
import { getCubeData } from './util/CubeCobra';
import { registerTheme } from 'echarts';
import darkbmjTheme from './echarts/theme.mjs';
import About from './components/About.vue';
import CubeDetailDialog from './components/CubeDetailDialog.vue';
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

// FIXME: Move these somewhere else and dynamically include/exclude them based on the ENV.
const presetComparisons = {
    "WotC MTGO/Arena": () => import("../preloads/cubes-wotc.json"),
    "CubeCobra Top 100": () => import("../preloads/cubes-cubecobra-top100.json"),
    // "CubeCon 2025": () => import("../preloads/cubes-cubecon2025.json"),
    // "haganbmj": () => import("../preloads/cubes-haganbmj.json"),
    "Peasant Cubes": () => import("../preloads/cubes-peasant.json"),
    // "Vertex Philly 2026": () => import("../preloads/cubes-vertex-philly-2026.json"),
    // "Cube For A Cause 2026": () => import("../preloads/cubes-c4ac-feb2026.json"),
    // "Connecticube 2026": () => import("../preloads/cubes-connecticube-2026.json"),
    "Shoebox 2026": () => import("../preloads/cubes-shoebox-2026.json"),
    "Cube Corner @ Amsterdam 2026": () => import("../preloads/cubes-cube-corner-2026.json"),
};

const loadedCubes = ref({});

const activeTab = ref('overview');

const cubeDetailDialogId = ref(null);
const cubeDetailDialogVisible = computed({
    get: () => cubeDetailDialogId.value !== null,
    set: (val) => { if (!val) cubeDetailDialogId.value = null; },
});
const cubeDetailDialogRow = computed(() => {
    if (!cubeDetailDialogId.value) return null;
    return overviewTableData.value.find(c => c.id === cubeDetailDialogId.value) || null;
});
const cubeDetailDialogCards = computed(() => {
    if (!cubeDetailDialogId.value) return [];
    return loadedCubes.value[cubeDetailDialogId.value]?.cards || [];
});
const openCubeDetailDialog = (cubeId) => {
    cubeDetailDialogId.value = cubeId;
};
provide('openCubeDetailDialog', openCubeDetailDialog);

const presetComparisonsSelect = ref(presetComparisons ? Object.keys(presetComparisons).map(key => ({ label: key, value: key })) : []);

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

const addCube = async (cubeId: string) => {
    await ensureScryfallInitialized();

    // Attempt to take just the Cube ID based on multiple possible input formats.
    const input = cubeId.split('?')[0].trim();
    const [ id ] = input.match(/([^\/]+)\/?$/);

    // If the cube is already loaded, skip it.
    if (!Object.values(loadedCubes.value).some(cube => cube.id === id || cube.shortId === id)) {
        console.time(`Add Cube: ${id}`);
        try {
            const rawCube = await getCubeData(id);
            const enrichedCube = remapCube(rawCube);
            loadedCubes.value[enrichedCube.id] = enrichedCube;
        } catch (e) {
            console.error("Error loading cube:", e);
        }
        await nextTick();
        console.timeEnd(`Add Cube: ${id}`);
    }
};

const loadCollection = async (presetName: string) => {
    if (presetName in presetComparisons) {
        console.time(`Render Collection: ${presetName}`);
        console.time(`Load Collection: ${presetName}`);

        await ensureScryfallInitialized();

        const cubesModule = await presetComparisons[presetName]();
        preloadSimiliarityMatrix(cubesModule.default.similarities);
        const enrichedCubes = Object.fromEntries(Object.entries(cubesModule.default.cubes).map(([id, cube]) => [id, enrichCube(cube)]));

        console.timeEnd(`Load Collection: ${presetName}`);
        loadedCubes.value = enrichedCubes;
        await nextTick();

        console.timeEnd(`Render Collection: ${presetName}`);
    }
};

/**
 * FIXME: Make this betterer.
 *  Doing a terrible job currently with these multiple IDs, and I think mutating the reactive object is done improperly.
 */
const removeCube = (cubeId: string) => {
    delete loadedCubes.value[cubeId];
};

onMounted(async () => {
    // Start scryfall initialization in the background without blocking the UI
    ensureScryfallInitialized();
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
}

.el-button:hover {
    color: var(--el-text-color-primary);
}

.el-header {
    padding-top: 1em;
    padding-bottom: 1em;
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
</style>
