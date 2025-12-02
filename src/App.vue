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
                    <el-dialog
                        v-model="columnCustomizationVisible"
                        title="Customize Columns"
                        width="600"
                        align-center
                    >
                        <div v-for="option in columnOptions" :key="option.label" style="margin-bottom: 1em;">
                            <h4>{{ option.label }}</h4>
                            <el-checkbox-group v-model="config.visibleColumns" style="width: 100%;">
                                <el-row :gutter="10">
                                    <el-col :span="12" :xs="24" :s="24" v-for="item in option.options" :key="item.value">
                                        <el-checkbox
                                            :label="item.value"
                                        >
                                            {{ item.label }}
                                            <el-popover
                                                v-if="item.tooltip"
                                                placement="bottom"
                                                width="300"
                                                trigger="hover"
                                            >
                                                <template #reference>
                                                    <el-icon><InfoFilled /></el-icon>
                                                </template>
                                                <template #default>
                                                    <p>{{ item.tooltip }}</p>
                                                </template>
                                            </el-popover>
                                        </el-checkbox>
                                    </el-col>
                                </el-row>
                            </el-checkbox-group>
                        </div>

                        <template #footer>
                            <el-button @click="columnCustomizationVisible = false">Close</el-button>
                        </template>
                    </el-dialog>

                    <el-tabs tab-position="top" v-model="activeTab">
                        <el-tab-pane :label="'Cubes (' + Object.keys(loadedCubes).length + ')'" name="overview" :lazy="true">
                            <el-row>
                                <el-col :span="18" :xs="24" :sm="24" :md="18" :lg="18">
                                    <el-form :model="addCubeForm" :inline="true" @submit.prevent="submitAddCubeForm" v-loading="addCubeForm.loading">
                                        <el-form-item>
                                            <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11">
                                                <el-form-item style="min-width: 200px; width: 100%;">
                                                    <el-select label="Collections" v-model="addCubeForm.presetComparisonsSelection" @change="loadPresetCollection" placeholder="Load Collection..." >
                                                        <el-option
                                                            v-for="option in presetComparisonsSelect"
                                                            :key="option.value"
                                                            :label="option.label"
                                                            :value="option.value"
                                                        />
                                                    </el-select>
                                                </el-form-item>
                                            </el-col>
                                            <el-col :span="2" :xs="0" :sm="0" :md="2" :lg="2" style="text-align: center;">
                                                <span class="text-gray-500">OR</span>
                                            </el-col>
                                            <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11" style="display: flex; align-items: center;">
                                                <el-row :gutter="10">
                                                    <el-col :span="20">
                                                        <el-form-item style="min-width: 200px; width: 100%;">
                                                            <el-input v-model="addCubeForm.cubeId" placeholder="Enter Cube ID" autofocus />
                                                        </el-form-item>
                                                    </el-col>
                                                    <el-col :span="4">
                                                        <el-form-item>
                                                            <el-button type="primary" @click="submitAddCubeForm" :disabled="addCubeForm.loading">Add</el-button>
                                                            <input type="submit" style="display: none;" />
                                                        </el-form-item>
                                                    </el-col>
                                                </el-row>
                                            </el-col>
                                        </el-form-item>
                                    </el-form>
                                </el-col>
                                <el-col :span="6" :xs="24" :sm="24" :md="6" :lg="6" style="text-align: right;">
                                    <el-button plain @click="columnCustomizationVisible = true" style="width: 100%; max-width: 250px;">Customize Columns</el-button>
                                </el-col>
                            </el-row>

                            <el-table
                                :data="overviewTableData"
                                :defaut-sort="{ prop: 'name', order: 'ascending' }"
                                :preserve-expanded-content="false"
                                style="width: 100%"
                                table-layout="auto"
                                stripe
                            >
                                <el-table-column :fixed="!isMobile" width="25" type="expand">
                                    <template #default="props">
                                        <el-row :gutter="20" justify="center" class="expanded-statistics" v-if="false">
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Total Cards" :value="props.row.stats.totalCards" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="New Cards (<1 yr)" :value="props.row.stats.newCards" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Land Cards" :value="props.row.stats.landCards" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Non-Land MV" :value="props.row.stats.averageNonLandCmc" :precision="2" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Card Elo" :value="props.row.stats.averageElo"/>
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Popularity" :value="props.row.stats.averagePopularity" :precision="2" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Universes Beyond" :value="props.row.stats.cardCounts.universesBeyond" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Supplmenetal Product" :value="props.row.stats.cardCounts.supplementalProduct" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Removal" :value="props.row.stats.cardCounts.removal / props.row.stats.totalCards * 100" :precision="2" suffix="%" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Word Count Excl. Reminder" :value="props.row.stats.averageWordCountMinusParen" :precision="2" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Non-Evergreen Keywords" :value="props.row.stats.uniqueNonEvergreenKeywords" />
                                            </el-col>
                                        </el-row>
                                        <el-row :gutter="10">
                                            <el-col :span="24">
                                                <el-row justify="space-between" class="chart-row" :gutter="20" style="margin-top: 1em;">
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <ManaValueChart class="chart" :cmcDistribution="props.row.stats?.cmcDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <ReleaseYearChart class="chart" :releaseYearDistribution="props.row.stats?.releaseYearDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <ColorIdentityDistribution class="chart" :colorDistribution="props.row.stats?.colorDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <TypeLineDistribution class="chart" :typeLineDistribution="props.row.stats?.typeLineDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <RarityDistribution class="chart" :rarityDistribution="props.row.stats?.rarityDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <LegalityDistribution class="chart" :legalityDistribution="props.row.stats?.minimumFormatLegalityDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                </el-row>
                                            </el-col>
                                            <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                                                <h3>Keywords ({{ props.row.stats.uniqueKeywords }})</h3>
                                                <KeywordTable :keywords="props.row.stats?.keywords || {}" :totalCards="props.row.stats?.totalCards || 1" />
                                            </el-col>
                                            <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                                                <h3>Similar Cubes</h3>
                                                <SimilarCubesTable :similarityMatrix="similarityMatrix" :loadedCubes="overviewTableData" :cubeId="props.row.id" />
                                            </el-col>
                                        </el-row>
                                    </template>
                                </el-table-column>
                                <el-table-column fixed prop="thumbnail" label="" width="75">
                                    <template #default="{ row }">
                                        <el-image :src="row.thumbnail" class="remove-thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                                        <el-button class="remove-button" size="small" type="danger" @click="removeCube(row.id)">
                                            <el-icon><Delete /></el-icon>
                                        </el-button>
                                    </template>
                                </el-table-column>
                                <el-table-column type="index" label="#" width="50" v-if="config.visibleColumns.includes('rowNumber')" />
                                <el-table-column prop="name" label="Name" min-width="150" max-width="300" show-overflow-tooltip sortable v-if="config.visibleColumns.includes('name')" >
                                    <template #default="{ row }">
                                        <el-link :href="`https://cubecobra.com/cube/overview/${row.id}`" target="_blank">{{ row.name }}</el-link>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="owner" label="Owner" min-width="100" max-width="150" show-overflow-tooltip sortable v-if="config.visibleColumns.includes('owner')" >
                                    <template #default="{ row }">
                                        <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.totalMinPriceUsd')"
                                    prop="stats.totalMinPriceUsd"
                                    label="Price (USD)"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toPriceUsd"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.totalCards')"
                                    prop="stats.totalCards"
                                    label="Total Cards"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.newCards')"
                                    prop="stats.newCards"
                                    :sort-method="(a, b) => (a.stats.newCards / a.stats.totalCards) - (b.stats.newCards / b.stats.totalCards)"
                                    label="New Cards"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.newCards / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.newCards }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.landCards')"
                                    prop="stats.landCards"
                                    :sort-method="(a, b) => (a.stats.landCards / a.stats.totalCards) - (b.stats.landCards / b.stats.totalCards)"
                                    label="Lands"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.landCards / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.landCards }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('avgSimilarityScore')"
                                    prop="avgSimilarityScore"
                                    label="Avg. Similarity"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.percentageFormatter"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageNonLandCmc')"
                                    prop="stats.averageNonLandCmc"
                                    label="Avg. Mana Value"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageElo')"
                                    prop="stats.averageElo"
                                    label="Avg. Elo"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averagePopularity')"
                                    prop="stats.averagePopularity"
                                    label="Avg. Popularity"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageWordCount')"
                                    prop="stats.averageWordCount"
                                    label="Avg. Word Count"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageWordCountMinusParen')"
                                    prop="stats.averageWordCountMinusParen"
                                    label="Avg. Word Count Excl. Reminder"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.uniqueKeywords')"
                                    prop="stats.uniqueKeywords"
                                    label="Keywords"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.uniqueNonEvergreenKeywords')"
                                    prop="stats.uniqueNonEvergreenKeywords"
                                    label="Non-Evergreen Keywords"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.abnormalLayout')"
                                    prop="stats.cardCounts.abnormalLayout"
                                    :sort-method="(a, b) => (a.stats.cardCounts.abnormalLayout / a.stats.totalCards) - (b.stats.cardCounts.abnormalLayout / b.stats.totalCards)"
                                    label="Abnormal Layout"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.abnormalLayout / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.abnormalLayout }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.makesTokens')"
                                    prop="stats.cardCounts.makesTokens"
                                    :sort-method="(a, b) => (a.stats.cardCounts.makesTokens / a.stats.totalCards) - (b.stats.cardCounts.makesTokens / b.stats.totalCards)"
                                    label="Makes Tokens"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.makesTokens / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.makesTokens }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.removal')"
                                    prop="stats.cardCounts.removal"
                                    :sort-method="(a, b) => (a.stats.cardCounts.removal / a.stats.totalCards) - (b.stats.cardCounts.removal / b.stats.totalCards)"
                                    label="Removal"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.removal / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.removal }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.universesBeyond')"
                                    prop="stats.cardCounts.universesBeyond"
                                    :sort-method="(a, b) => (a.stats.cardCounts.universesBeyond / a.stats.totalCards) - (b.stats.cardCounts.universesBeyond / b.stats.totalCards)"
                                    label="Universes Beyond"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.universesBeyond / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.universesBeyond }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.supplementalProduct')"
                                    prop="stats.cardCounts.supplementalProduct"
                                    :sort-method="(a, b) => (a.stats.cardCounts.supplementalProduct / a.stats.totalCards) - (b.stats.cardCounts.supplementalProduct / b.stats.totalCards)"
                                    label="Supplemental Product"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.supplementalProduct / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.supplementalProduct }})</el-text>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="Statistics" name="statistics" :lazy="true">
                            <div style="width: 100%;">
                                <StatisticsTab :loadedCubes="overviewTableData" />
                            </div>
                        </el-tab-pane>

                        <el-tab-pane label="Cards" name="cards" :lazy="true">
                            <div style="width: 100%;">
                                <CardSummaryTable :loadedCubes="loadedCubes" />
                            </div>
                        </el-tab-pane>

                        <el-tab-pane label="Keywords" name="keywords" :lazy="true" v-if="false">
                            <p>Big old TODO.</p>
                        </el-tab-pane>

                        <el-tab-pane label="Similarity Matrix" name="similarity-matrix" :lazy="true" v-if="false">
                            <p>Big old TODO. Cosine similarity matrix perhaps?</p>
                        </el-tab-pane>

                        <el-tab-pane label="About" name="about" :lazy="true">
                            <About />
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </el-main>
            <el-footer>
                <div style="text-align: center;">
                    <el-text tag="small">{{ randomFooter() }}</el-text>
                </div>
            </el-footer>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, provide, onMounted } from 'vue';
import { THEME_KEY } from 'vue-echarts';
import { getNestedProp } from './util/HelperFunctions.mjs';
import randomFooter from './util/RandomFooter.mjs';
import { initScryfall, remapCube, analyzeCubeContents, enrichCubeContents, determineSimilarityScores, determineCosineSimilarityScore } from './util/CubeFunctions.mjs';
import { getCubeData } from './util/CubeCobra.mjs';
import { bindStorage } from './util/VueLocalStorage.mjs';
import ManaValueChart from './components/ManaValueChart.vue';
import ColorIdentityDistribution from './components/ColorIdentityDistribution.vue';
import TypeLineDistribution from './components/TypeLineDistribution.vue';
import KeywordTable from './components/KeywordTable.vue';
import RarityDistribution from './components/RarityDistribution.vue';
import ReleaseYearChart from './components/ReleaseYearChart.vue';

import { registerTheme } from 'echarts';
import darkbmjTheme from './echarts/theme.mjs';
import LegalityDistribution from './components/LegalityDistribution.vue';
import CardSummaryTable from './components/CardSummaryTable.vue';
import About from './components/About.vue';
import StatisticsTab from './tabs/StatisticsTab.vue';
import SimilarCubesTable from './components/SimilarCubesTable.vue';

registerTheme('darkbmj', darkbmjTheme);

provide(THEME_KEY, "darkbmj");

// FIXME: Move these somewhere else and dynamically include/exclude them based on the ENV.
const presetComparisons = {
    "WotC MTGO/Arena": () => import("../preloads/cubes-wotc.json"),
    "CubeCobra Top 100": () => import("../preloads/cubes-cubecobra-top100.json"),
    "CubeCon 2025": () => import("../preloads/cubes-cubecon2025.json"),
    // "haganbmj": () => import("../preloads/cubes-haganbmj.json"),
    "Peasant Cubes": () => import("../preloads/cubes-peasant.json"),
};

const defaultConfig = {
    visibleColumns: [
        'rowNumber',
        'name',
        'owner',
        'stats.totalCards',
        'avgSimilarityScore',
        'stats.averageNonLandCmc',
        'stats.averageWordCountMinusParen',
        'stats.cardCounts.removal',
        'stats.uniqueNonEvergreenKeywords',
    ],
};

const isMobile = computed(() => {
  return screen.width <= 760;
});

const config = bindStorage('cube-app-config', (v) => {
    if (v == undefined || v === null) {
        return defaultConfig;
    } else {
        // FIXME: I'd like a more robust way to do this, but it's fine with only two props.
        return {
            visibleColumns: Array.isArray(v.visibleColumns) ? v.visibleColumns : defaultConfig.visibleColumns,
        }
    }
});

const columnCustomizationVisible = ref(false);

const addCubeForm = reactive({
    loading: false,
    cubeId: '',
});

const loadedCubes = ref({});

const loadPresetCollection = async (presetName: string) => {
    if (presetName in presetComparisons) {
        console.time(`Load Collection: ${presetName}`);
        addCubeForm.loading = true;
        const cubesModule = await presetComparisons[presetName]();
        const enrichedCubes = Object.fromEntries(Object.entries(cubesModule.default).map(cube => [cube[0], { ...cube[1], cards: enrichCubeContents(cube[1].cards) }]));
        console.timeEnd(`Load Collection: ${presetName}`);
        loadedCubes.value = enrichedCubes;
        addCubeForm.loading = false;
        addCubeForm.presetComparisonsSelection = '';
    }
};

const presetComparisonsSelect = ref(presetComparisons ? Object.keys(presetComparisons).map(key => ({ label: key, value: key })) : []);

const activeTab = ref('overview');

const columnOptions = ref([
    {
        label: 'Core',
        options: [
            { value: 'rowNumber', label: "Row Number" },
            // { value: 'thumbnail', label: "Thumbnail" }, // Not letting this be configurable at the moment...
            { value: 'name', label: "Name" },
            { value: 'owner', label: "Owner" },
            { value: 'stats.totalMinPriceUsd', label: "Price (USD)", tooltip: "Total Minimum Price of the Cube in USD" },
            { value: 'stats.totalCards', label: "Total Cards", tooltip: "Total Number of Cards" },
            { value: 'stats.newCards', label: "New Cards", tooltip: "Cards Released in the Last 12 Months" },
            { value: 'stats.landCards', label: "Lands", tooltip: "Total Number of Land Cards, includes MDFCs" },
        ],
    },
    {
        label: 'Summary Stats',
        options: [
            { value: 'avgSimilarityScore', label: "Avg. Similarity", tooltip: "Average Cosine Similarity Score vs. Other Loaded Cubes" },
            { value: 'stats.averageNonLandCmc', label: "Avg. Mana Value", tooltip: "Average Mana Value of Non-Land Cards" },
            { value: 'stats.averageElo', label: "Avg. Card Elo", tooltip: "Average CubeCobra Card Elo Rating" },
            { value: 'stats.averagePopularity', label: "Avg. Card Popularity", tooltip: "Average CubeCobra Card Popularity Score" },
        ],
    },
    {
        label: 'Characteristics',
        options: [
            { value: 'stats.averageWordCount', label: 'Avg. Word Count', tooltip: "Average Oracle Text Word Count" },
            { value: 'stats.averageWordCountMinusParen', label: 'Avg. Word Count Excl. Reminder', tooltip: "Average Oracle Text Word Count, excluding anything in Parentheses" },
            { value: 'stats.uniqueKeywords', label: "Keywords", tooltip: "Number of Unique Keywords" },
            { value: 'stats.uniqueNonEvergreenKeywords', label: "Non-Evergreen Keywords", tooltip: "Number of Unique Non-Evergreen Keywords" },
            { value: 'stats.cardCounts.abnormalLayout', label: "Abnormal Layout", tooltip: "Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" },
            { value: 'stats.cardCounts.makesTokens', label: "Makes Tokens", tooltip: "Cards that Create one or more Tokens" },
            { value: 'stats.cardCounts.removal', label: "Removal Density", tooltip: "Cards tagged with `removal` in Scryfall's Tagger" },
        ],
    },
    {
        label: 'Product Line',
        options: [
            { value: 'stats.cardCounts.universesBeyond', label: "Universes Beyond", tooltip: "Cards from Universes Beyond Products (includes Standard sets)" },
            { value: 'stats.cardCounts.supplementalProduct', label: "Supplemental Product", tooltip: "Cards from Supplemental Products (includes Portal)" },
        ],
    },
]);

const similarityMatrix = computed(() => {
    const result = {};
    let calcs = 0;

    Object.entries(loadedCubes.value).forEach(([id, cube]) => {
        Object.entries(loadedCubes.value).forEach(([otherId, otherCube]) => {
            if (id !== otherId && result[id]?.[otherId] === undefined) {
                calcs += 1;
                const score = determineCosineSimilarityScore(cube, otherCube);
                if (!(id in result)) {
                    result[id] = {};
                }

                if (!(otherId in result)) {
                    result[otherId] = {};
                }

                result[id][otherId] = score;
                result[otherId][id] = score;
            }
        });
    });

    return result;
});

// FIXME: Is there a way to indicate that this should wait until after similarityMatrix is recomputed?
const overviewTableData = computed(() => {
    return Object.entries(loadedCubes.value).map(([id, cube]) => {
        const similarityScores = similarityMatrix.value[id] || {};
        return {
            ...cube,
            stats: analyzeCubeContents(cube.cards),
            similarityScores: similarityScores,
            avgSimilarityScore: Object.values(similarityScores).length > 0 ? Object.values(similarityScores).reduce((acc, c) => acc + c.cosineSimilarity, 0) / Object.values(similarityScores).length : 0,
        }
    });
});

const submitAddCubeForm = async () => {
    addCubeForm.loading = true;

    // Attempt to take just the Cube ID based on multiple possible input formats.
    const input = addCubeForm.cubeId.split('?')[0].trim();
    const [ cubeId ] = input.match(/([^\/]+)\/?$/);

    // If the cube is already loaded, skip it.
    if (!Object.values(loadedCubes.value).some(cube => cube.id === cubeId || cube.shortId === cubeId)) {
        console.time(`Add Cube: ${cubeId}`);
        try {
            const rawCube = await getCubeData(cubeId);
            const remappedCube = await remapCube(rawCube);
            loadedCubes.value[remappedCube.id] = remappedCube;
        } catch (e) {
            console.error("Error loading cube:", e);
        }
        console.timeEnd(`Add Cube: ${cubeId}`);
    }

    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
};

/**
 * FIXME: Make this betterer.
 *  Doing a terrible job currently with these multiple IDs, and I think mutating the reactive object is done improperly.
 */
const removeCube = (cubeId: string) => {
    delete loadedCubes.value[cubeId];
};

const formatters = {
    toFixed2: (value: number) => {
        return value.toFixed(2);
    },
    toPriceUsd: (value: number) => {
        return '$' + value.toFixed(2);
    },
    percentageFormatter: (value: number) => {
        return (value * 100).toFixed(2) + '%';
    },
};

const columnFormatters = {
    toFixed2: (row, column) => {
        return (getNestedProp(row, column.property) ?? 0).toFixed(2);
    },
    toPriceUsd: (row, column) => {
        return '$' + (getNestedProp(row, column.property) ?? 0).toFixed(2);
    },
    percentageFormatter: (row, column) => {
        return ((getNestedProp(row, column.property) ?? 0) * 100).toFixed(2) + '%';
    },
};

onMounted(async () => {
    // FIXME: This doesn't have to block the cube form. Could just block the first access to the Scryfall data.
    addCubeForm.loading = true;
    await initScryfall();
    addCubeForm.loading = false;
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

.expanded-statistics > .el-col {
    margin-top: 1.5em;
}

.cell-secondary {
    color: var(--el-text-color-secondary);
    margin-left: 0.5em;
}
</style>
