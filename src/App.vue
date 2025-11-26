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
                            <div id="inputs">
                                <el-form :model="addCubeForm" :inline="true" @submit.prevent="submitAddCubeForm" v-loading="addCubeForm.loading">
                                    <el-form-item>
                                        <el-select label="Collections" v-model="addCubeForm.presetComparisonsSelection" @change="loadPresetCollection" placeholder="Load Collection..." style="width: 200px;">
                                            <el-option
                                                v-for="option in presetComparisonsSelect"
                                                :key="option.value"
                                                :label="option.label"
                                                :value="option.value"
                                            />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item>OR</el-form-item>
                                    <el-form-item style="margin-right: 6px;">
                                        <el-input v-model="addCubeForm.cubeId" placeholder="Enter Cube ID" autofocus />
                                    </el-form-item>
                                    <el-form-item>
                                        <el-button type="primary" @click="submitAddCubeForm" :disabled="addCubeForm.loading">Add</el-button>
                                        <input type="submit" style="display: none;" />
                                    </el-form-item>
                                </el-form>
                            </div>

                            <el-space direction="horizontal" style="width: 100%; justify-content: space-between; align-items: center; margin-bottom: 1em;">
                                <!-- <el-text tag="i">Loaded Cubes: {{ Object.keys(loadedCubes).length }}</el-text> -->
                                <el-form :inline="true" style="justify-content: flex-end; display: flex;">
                                    <el-form-item label="Exclude Lands:">
                                        <el-switch v-model="config.excludeLands" active-color="#13ce66" inactive-color="#ff4949" />
                                    </el-form-item>
                                    <el-form-item label="Columns:">
                                        <el-select
                                            v-model="config.visibleColumns"
                                            multiple
                                            collapse-tags
                                            label="Visible Columns"
                                            placeholder="Select columns"
                                            style="width:250px;"
                                        >
                                            <el-option-group
                                                v-for="group in columnOptions"
                                                :key="group.label"
                                                :label="group.label"
                                            >
                                                <el-option
                                                    v-for="item in group.options"
                                                    :key="item.value"
                                                    :label="item.label"
                                                    :value="item.value"
                                                />
                                            </el-option-group>
                                        </el-select>
                                    </el-form-item>
                                </el-form>
                            </el-space>

                            <el-table
                                :data="overviewTableData"
                                :defaut-sort="{ prop: 'name', order: 'ascending' }"
                                :preserve-expanded-content="false"
                                style="width: 100%"
                                table-layout="auto"
                                stripe
                            >
                                <el-table-column fixed width="25" type="expand">
                                    <template #default="props">
                                        <el-row>
                                            <el-col :span="14" :xs="24" :sm="24" :md="24" :xl="16">
                                                <el-row justify="space-between" class="chart-row" :gutter="20" style="margin-top: 1em;">
                                                    <el-col :span="12" :xs="24" :md="12" :xl="12">
                                                        <div style="height: 300px;">
                                                            <ManaValueChart class="chart" :cmcDistribution="props.row.stats?.cmcDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="12">
                                                        <div style="height: 300px;">
                                                            <ReleaseYearChart class="chart" :releaseYearDistribution="props.row.stats?.releaseYearDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="12">
                                                        <div style="height: 300px;">
                                                            <ColorIdentityDistribution class="chart" :colorDistribution="props.row.stats?.colorDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="12">
                                                        <div style="height: 300px;">
                                                            <TypeLineDistribution class="chart" :typeLineDistribution="props.row.stats?.typeLineDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="12">
                                                        <div style="height: 300px;">
                                                            <RarityDistribution class="chart" :rarityDistribution="props.row.stats?.rarityDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="12">
                                                        <div style="height: 300px;">
                                                            <LegalityDistribution class="chart" :legalityDistribution="props.row.stats?.minimumFormatLegalityDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                </el-row>
                                            </el-col>
                                            <el-col :span="10" :xs="24" :sm="24" :md="24" :xl="8">
                                                <KeywordTable :keywords="props.row.stats?.keywords || {}" :totalCards="props.row.stats?.filteredCards || 1" />
                                            </el-col>
                                        </el-row>
                                    </template>
                                </el-table-column>
                                <el-table-column fixed prop="thumbnail" label="" width="75">
                                    <template #default="{ row }">
                                        <el-image :src="row.thumbnail" class="remove-thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                                        <el-button class="remove-button" size="small" type="danger" @click="removeCube(row.id, row.shortId)">
                                            <el-icon><Delete /></el-icon>
                                        </el-button>
                                    </template>
                                </el-table-column>
                                <el-table-column fixed type="index" label="#" width="50" v-if="config.visibleColumns.includes('rowNumber')" />
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

                                <el-table-column prop="category" label="Category" min-width="100" max-width="125" sortable v-if="config.visibleColumns.includes('category')" />
                                <el-table-column prop="categoryPrefixes" label="Category Prefixes" min-width="100" max-width="125" show-overflow-tooltip sortable v-if="config.visibleColumns.includes('categoryPrefixes')" />
                                <el-table-column prop="stats.totalCards" label="Total Cards" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.totalCards')" />
                                <el-table-column prop="stats.newCards" label="New Cards" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.newCards')" />
                                <el-table-column prop="stats.percentages.newCards" label="% New Cards" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.newCards')" />
                                <el-table-column prop="stats.landCards" label="Lands" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.landCards')" />
                                <el-table-column prop="stats.percentages.landCards" label="% Lands" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.landCards')" />
                                <el-table-column prop="stats.averageNonLandCmc" label="Avg. Non-Land MV" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averageNonLandCmc')" />
                                <el-table-column prop="stats.averageElo" label="Avg. Card Elo" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averageElo')" />
                                <el-table-column prop="stats.averagePopularity" label="Avg. Card Popularity" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averagePopularity')" />

                                <el-table-column prop="stats.cardCounts.universesBeyond" label="Universes Beyond" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.cardCounts.universesBeyond')" />
                                <el-table-column prop="stats.percentages.universesBeyond" label="% Universes Beyond" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.universesBeyond')" />
                                <el-table-column prop="stats.cardCounts.supplementalProduct" label="Supplemental Product" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.cardCounts.supplementalProduct')" />
                                <el-table-column prop="stats.percentages.supplementalProduct" label="% Supplemental Product" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.supplementalProduct')" />

                                <el-table-column prop="stats.averageWordCount" label="Avg. Word Count" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averageWordCount')" />
                                <el-table-column prop="stats.averageWordCountMinusParen" label="Avg. Word Count Excl. Reminder" min-width="75" max-width="100" sortable :formatter="toFixed2" v-if="config.visibleColumns.includes('stats.averageWordCountMinusParen')" />
                                <el-table-column prop="stats.uniqueKeywords" label="Unique Keywords" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.uniqueKeywords')" />

                                <el-table-column prop="stats.cardCounts.abnormalLayout" label="Abnormal Layout" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.cardCounts.abnormalLayout')" />
                                <el-table-column prop="stats.percentages.abnormalLayout" label="% Abnormal Layout" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.abnormalLayout')" />
                                <el-table-column prop="stats.cardCounts.makesTokens" label="Makes Tokens" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.cardCounts.makesTokens')" />
                                <el-table-column prop="stats.percentages.makesTokens" label="% Makes Tokens" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.makesTokens')" />
                                <el-table-column prop="stats.cardCounts.initiative" label="Initiative" min-width="75" max-width="100" sortable v-if="config.visibleColumns.includes('stats.cardCounts.initiative')" />
                                <el-table-column prop="stats.percentages.initiative" label="% Initiative" min-width="75" max-width="100" sortable :formatter="percentageFormatter" v-if="config.visibleColumns.includes('stats.percentages.initiative')" />
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="Cards" name="cards" :lazy="true">
                            <div style="width: 100%;">
                                <CardSummaryTable :data="cardsTableData" :loadedCubes="loadedCubes" />
                            </div>
                        </el-tab-pane>

                        <el-tab-pane label="Keywords" name="keywords" :lazy="true" v-if="false">
                            <p>Big old TODO.</p>
                        </el-tab-pane>

                        <el-tab-pane label="Statistics" name="statistics" :lazy="true" v-if="false">
                            <p>Big old TODO. Probably just the same stats as per-cube, but at the aggregate level?</p>
                        </el-tab-pane>

                        <el-tab-pane label="Similarity Matrix" name="similarity-matrix" :lazy="true" v-if="false">
                            <p>Big old TODO. Cosine similarity matrix perhaps?</p>
                        </el-tab-pane>

                        <el-tab-pane label="About" name="about" :lazy="true">
                            <h3>Notes</h3>
                            <ul>
                                <li>All cards are evaluated using their original printings only.</li>
                                <li>Cards with multiple faces are (currently) evaluated using their front face only.</li>
                                <li>Any card overrides (color, cmc, etc) made in CubeCobra are ignored.</li>
                                <li>Keywords are a best effort, there are a number of things not classified as "keywords" by the comp rules (Initiative, Monarch, "Becomes Day", etc) and things like Adventure are considered card layouts rather than keywords.</li>
                                <li>Word count is a best effort, this is using Scryfall's oracle text which sometimes includes reminder text. The column excluding reminder text is just a naive stripping of any text between parenthesis in the oracle text, which will catch some false positives.</li>
                                <li>Minimum Format Legality is looking to represent the "smallest" sanctioned paper format that the cards are legal in? (Standard < Pioneer < Modern < Legacy < Vintage < Cube).</li>
                                <li>This site is statically compiled and uses cached information where possible, so collections or card details may be (slightly) out of date.</li>
                            </ul>

                            <h3>TODOs</h3>
                            <ul>
                                <li>Add persistence for displayed columns.</li>
                                <li>Enrich the handling of MDFCs.</li>
                                <li>Figure out how to do second order sorting in Element Plus tables.</li>
                                <li>Look at adding filtering options.</li>
                                <li>Support CubeCobra custom cards more better.</li>
                                <li>Derive categories based on cube contents rather than relying on user-defined CubeCobra metadata.</li>
                                <li>Add some more evaluations, like a comparison matrix, card stats, summary stats, etc.</li>
                                <li>Consider trying to make this a bit more mobile friendly.</li>
                                <li>Consider adding the ability to define/save custom cube collections.</li>
                                <li>Add a way to retrieve all cubes for a CubeCobra user?</li>
                            </ul>

                            <h3>Data Sources</h3>
                            <ul>
                                <li><a href="https://cubecobra.com" target="_blank">CubeCobra</a> - All cube data.</li>
                                <li><a href="https://scryfall.com" target="_blank">Scryfall</a> - Card details, card imagery.</li>
                            </ul>

                            <h3>Build Details</h3>
                            <ul>
                                <li>Repository: <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank">github.com/haganbmj/mtg-cube-stats</a></li>
                                <li>Build SHA: <a :href="'https://github.com/haganbmj/mtg-cube-stats/commit/' + getBuildSha()" target="_blank">{{ getBuildSha() }}</a></li>
                                <li>Timestamp: {{ getBuildTimestamp() }}</li>
                            </ul>

                            <el-text tag="i">This site is not affiliated with or endorsed by Wizards of the Coast, CubeCobra, CubeCon, or Scryfall.</el-text>
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
import { initScryfall, remapCube, analyzeCubeContents, enrichCubeContents } from './util/CubeFunctions.mjs';
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

registerTheme('darkbmj', darkbmjTheme);

provide(THEME_KEY, "darkbmj");

// FIXME: Move these somewhere else and dynamically include/exclude them based on the ENV.
const presetComparisons = {
    "WotC MTGO/Arena": () => import("../preloads/cubes-wotc.json"),
    "CubeCon 2025": () => import("../preloads/cubes-cubecon2025.json"),
    // "haganbmj": () => import("../preloads/cubes-haganbmj.json"),
    "Peasant Cubes": () => import("../preloads/cubes-peasant.json"),
};

const defaultConfig = {
    excludeLands: false,
    visibleColumns: [
        'rowNumber',
        'name',
        'owner',
        'stats.totalCards',
        'stats.percentages.newCards',
        'stats.percentages.landCards',
        'stats.averageNonLandCmc',
        'stats.averageWordCountMinusParen',
        'stats.uniqueKeywords',
        'stats.percentages.makesTokens',
    ],
};

const config = bindStorage('appConfig', (v) => {
    if (v == undefined || v === null) {
        return defaultConfig;
    } else {
        // FIXME: I'd like a more robust way to do this, but it's fine with only two props.
        return {
            excludeLands: v.excludeLands === true,
            visibleColumns: Array.isArray(v.visibleColumns) ? v.visibleColumns : defaultConfig.visibleColumns,
        }
    }
});

const addCubeForm = reactive({
    loading: false,
    cubeId: '',
});

const loadedCubes = reactive({});

const loadPresetCollection = async (presetName: string) => {
    if (presetName in presetComparisons) {
        addCubeForm.loading = true;
        const cubesModule = await presetComparisons[presetName]();
        const enrichedCubes = Object.fromEntries(Object.entries(cubesModule.default).map(cube => [cube[0], { ...cube[1], cards: enrichCubeContents(cube[1].cards) }]));
        Object.keys(loadedCubes).forEach(key => delete loadedCubes[key]);
        Object.assign(loadedCubes, enrichedCubes);
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
            // { value: 'thumbnail', label: "Thumbnail" },
            { value: 'name', label: "Name" },
            { value: 'owner', label: "Owner" },
            { value: 'category', label: "Category" },
            { value: 'categoryPrefixes', label: "Category Prefixes" },
            { value: 'stats.totalCards', label: "Total Cards" },
            { value: 'stats.newCards', label: "\"New\" Cards (Last 12 Months)" },
            { value: 'stats.percentages.newCards', label: "% \"New\" Cards (Last 12 Months)" },
            { value: 'stats.landCards', label: "Lands" },
            { value: 'stats.percentages.landCards', label: "% Lands" },
            { value: 'stats.averageNonLandCmc', label: "Avg. Non-Land MV" },
            { value: 'stats.averageElo', label: "Avg. Card Elo" },
            { value: 'stats.averagePopularity', label: "Avg. Card Popularity" },
        ],
    },
    {
        label: 'Product Line',
        options: [
            { value: 'stats.cardCounts.universesBeyond', label: "Universes Beyond" },
            { value: 'stats.percentages.universesBeyond', label: "% Universes Beyond" },
            { value: 'stats.cardCounts.supplementalProduct', label: "Supplemental Product" },
            { value: 'stats.percentages.supplementalProduct', label: "% Supplemental Product" },
        ],
    },
    {
        label: 'Characteristics',
        options: [
            { value: 'stats.averageWordCount', label: 'Avg. Word Count' },
            { value: 'stats.averageWordCountMinusParen', label: 'Avg. Word Count Excl. Reminder' },
            { value: 'stats.uniqueKeywords', label: "Unique Keywords" },
            { value: 'stats.cardCounts.abnormalLayout', label: "Abnormal Layout" },
            { value: 'stats.percentages.abnormalLayout', label: "% Abnormal Layout" },
            { value: 'stats.cardCounts.makesTokens', label: "Makes Tokens" },
            { value: 'stats.percentages.makesTokens', label: "% Makes Tokens" },
            { value: 'stats.cardCounts.initiative', label: "Initiative" },
            { value: 'stats.percentages.initiative', label: "% Initiative" },
        ],
    },
]);

const overviewTableData = computed(() => {
    return Object.entries(loadedCubes).map(([id, cube]) => {
        return {
            ...cube,
            stats: analyzeCubeContents(cube.cards, config.excludeLands),
        }
    });
});

const cardsTableData = computed(() => {
    if (Object.keys(loadedCubes).length === 0) {
        return [];
    }
    const allCards = Object.keys(loadedCubes).reduce((allCards, key) => {
        loadedCubes[key].cards.forEach(card => {
            if (allCards[card.oracleId] === undefined) {
                allCards[card.oracleId] = {
                    ...card,
                    count: 0,
                    cubes: [], // TODO:
                    cubeCount: 0,
                };
            }

            allCards[card.oracleId].count += 1;
            if (!allCards[card.oracleId].cubes.includes(key)) {
                allCards[card.oracleId].cubes.push(key);
                allCards[card.oracleId].cubeCount += 1;
            }
        });

        return allCards;
    }, {});

    return Object.values(allCards);
});

const submitAddCubeForm = async () => {
    addCubeForm.loading = true;

    // Attempt to take just the Cube ID based on multiple possible input formats.
    const input = addCubeForm.cubeId.split('?')[0].trim();
    const [ cubeId ] = input.match(/([^\/]+)\/?$/);

    // FIXME: This ideally should handle deduping on both IDs for a cube. The user-defined and the system-defined.
    if (!(cubeId in loadedCubes)) {
        try {
            const rawCube = await getCubeData(cubeId);
            loadedCubes[cubeId] = await remapCube(rawCube);
        } catch (e) {
            console.error("Error loading cube:", e);
        }
    }

    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
};

/**
 * FIXME: Make this betterer.
 *  Doing a terrible job currently with these multiple IDs, and I think mutating the reactive object is done improperly.
 */
const removeCube = (cubeId: string, shortId: string) => {
    delete loadedCubes[cubeId];
    delete loadedCubes[shortId];
};

const toFixed2 = (row, column) => {
    return (getNestedProp(row, column.property) ?? 0).toFixed(2);
}

const percentageFormatter = (row, column) => {
    return ((getNestedProp(row, column.property) ?? 0) * 100).toFixed(2) + '%';
}

function getBuildTimestamp() {
    return import.meta.env.VITE_BUILD_TIMESTAMP;
}

function getBuildSha() {
    return import.meta.env.VITE_BUILD_SHA || 'local';
}

onMounted(async () => {
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
</style>
