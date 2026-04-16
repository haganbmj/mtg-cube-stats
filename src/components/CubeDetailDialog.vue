<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="$emit('update:visible', $event)"
        width="90%"
        style="max-width: 1500px;"
        top="5vh"
        align-center
        destroy-on-close
    >
        <template #header>
            <div v-if="activeCube" class="cube-dialog-header">
                <el-image :src="activeCube.thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                <el-link :href="`https://cubecobra.com/cube/list/${activeCube.id}`" target="_blank" type="default" underline="never">
                    <span class="cube-dialog-name">{{ activeCube.name }}</span>
                    <el-icon class="el-icon--right"><Link /></el-icon>
                </el-link>
                <span class="cube-dialog-separator"> &mdash; </span>
                <el-link :href="`https://cubecobra.com/user/view/${activeCube.ownerId}`" target="_blank" underline="never">
                    <span class="cube-dialog-owner">{{ activeCube.owner }}</span>
                </el-link>
            </div>
            <div v-if="activeCube?.brief" class="cube-dialog-brief" v-html="renderedBrief"></div>
        </template>

        <template v-if="activeCube">
            <el-tabs tab-position="top">
                <el-tab-pane label="Details">
                    <el-row>
                        <el-col :span="24" :xs="24">
                            <div class="external-links">
                                <el-space wrap>
                                    <el-button tag="a" :href="`https://cubecobra.com/cube/list/${activeCube.id}`" target="_blank">CubeCobra</el-button>
                                    <el-button tag="a" :href="`https://hedron.network/cube-results/?cubeId=${activeCube.id}`" target="_blank">Hedron Network</el-button>
                                    <el-button tag="a" :href="`https://luckypaper.co/resources/cube-map/?cube=${activeCube.id}`" target="_blank">LuckyPaper Cube Map</el-button>
                                </el-space>
                            </div>
                        </el-col>
                    </el-row>
                    <el-row class="details-tab">
                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Core" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Total Number of Cards" placement="top" :hide-after="50"><span>Total Cards <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ activeCube.stats?.totalCards ?? 0 }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Date when the contents or description of the cube was last modified" placement="top" :hide-after="50"><span>Last Modified <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formattedLastModified }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Number of users following the cube on CubeCobra" placement="top" :hide-after="50"><span>Followers <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ activeCube.followerCount ?? 0 }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Assumed Categorization of the cube based on its contents (pauper, peasant, powered, desert)" placement="top" :hide-after="50"><span>Categories <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    <el-tag
                                        v-for="category in (activeCube.stats?.assumedCategories || [])"
                                        :key="category"
                                        size="default"
                                        type="info"
                                        style="margin-right: 0.25rem;"
                                        disable-transitions
                                    >
                                        {{ category }}
                                    </el-tag>
                                    <span v-if="!(activeCube.stats?.assumedCategories || []).length">&mdash;</span>
                                </el-descriptions-item>
                                <el-descriptions-item v-if="cubeCategory">
                                    <template #label><el-tooltip content="Broad ML-derived cube category based on cluster profile similarity to 245K CubeCobra cubes" placement="top" :hide-after="50"><span>ML Category <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    <el-tooltip :content="`Top clusters: ${cubeCategory.topClusters.slice(0,5).map(id => 'Cluster ' + (id + 1)).join(', ')}`" placement="top" :hide-after="50">
                                        <el-tag size="default" type="warning">Category {{ cubeCategory.id + 1 }}</el-tag>
                                    </el-tooltip>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Whether the cube is playable on MTG Arena" placement="top" :hide-after="50"><span>Arena Playable <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    <el-tag :type="activeCube.stats?.arenaPlayable ? 'success' : 'danger'" size="default">{{ activeCube.stats?.arenaPlayable ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Whether the cube is playable on MTGO" placement="top" :hide-after="50"><span>MTGO Playable <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    <el-tag :type="activeCube.stats?.mtgoPlayable ? 'success' : 'danger'" size="default">{{ activeCube.stats?.mtgoPlayable ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Whether the cube is playable in Paper (no Digital-only printings, no Custom cards)" placement="top" :hide-after="50"><span>Paper Playable <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    <el-tag :type="activeCube.stats?.paperPlayable ? 'success' : 'danger'" size="default">{{ activeCube.stats?.paperPlayable ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="This cube contains cards that care about Graveyard Order" placement="top" :hide-after="50"><span>Graveyard Order Matters <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    <el-tag :type="activeCube.stats?.graveyardOrderMatters ? 'warning' : 'info'" size="default">{{ activeCube.stats?.graveyardOrderMatters ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Card Counts" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Number of unique cards by oracle ID, as a percentage of the total" placement="top" :hide-after="50"><span>Unique Cards <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.totalUniqueCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.totalUniqueCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards Released in the Last 12 Months" placement="top" :hide-after="50"><span>New Cards <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.newCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.newCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards that are playable from hand as a Land, includes MDFCs" placement="top" :hide-after="50"><span>Lands <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.landCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.landCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards with 'Creature' in their Type Line" placement="top" :hide-after="50"><span>Creatures <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.creatureCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.creatureCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards tagged as 'removal' in Scryfall's Tagger" placement="top" :hide-after="50"><span>Removal <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.removal, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.removal ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards that Create one or more Tokens" placement="top" :hide-after="50"><span>Makes Tokens <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.makesTokens, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.makesTokens ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Number of unique token types produced by cards in the cube" placement="top" :hide-after="50"><span>Unique Tokens <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ activeCube.stats?.uniqueTokenCount ?? 0 }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" placement="top" :hide-after="50"><span>Abnormal Layout <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.abnormalLayout, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.abnormalLayout ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards originally from Universes Beyond Products (includes Standard sets)" placement="top" :hide-after="50"><span>Universes Beyond <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.universesBeyond, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.universesBeyond ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Cards originally from Supplemental Products (includes Portal)" placement="top" :hide-after="50"><span>Supplemental Product <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.supplementalProduct, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.supplementalProduct ?? 0 }})</span>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Summary Stats" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average Cosine Similarity Score vs. Other Loaded Cubes" placement="top" :hide-after="50"><span>Avg. Similarity <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ formatPercentage(avgSimilarityScore, 1) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average Mana Value of Non-Land Cards" placement="top" :hide-after="50"><span>Avg. Mana Value <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.averageNonLandCmc ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average CubeCobra Card Elo Rating" placement="top" :hide-after="50"><span>Avg. Card Elo <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.averageElo ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average CubeCobra Card Popularity Score" placement="top" :hide-after="50"><span>Avg. Card Popularity <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.averagePopularity ?? 0).toFixed(2) }} %
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200" placement="top" :hide-after="50"><span>Rarity Score <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.blendedRarityScore ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average Release Year of Cards in the Cube (± Standard Deviation)" placement="top" :hide-after="50"><span>Avg. Release Year <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ Math.round(activeCube.stats?.averageReleaseYear ?? 0) }} (±{{ (activeCube.stats?.averageReleaseYearStdDev ?? 0).toFixed(1) }})
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Median Release Year of Cards in the Cube (± Median Absolute Deviation)" placement="top" :hide-after="50"><span>Median Release Year <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ Math.round(activeCube.stats?.medianReleaseYear ?? 0) }} (±{{ (activeCube.stats?.medianReleaseYearMAD ?? 0).toFixed(1) }})
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Characteristics" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average Oracle Text Word Count, excluding Reminder Text" placement="top" :hide-after="50"><span>Avg. Word Count <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.averageWordCount ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Average Oracle Text Word Count of Unique Cards, excluding Reminder Text" placement="top" :hide-after="50"><span>Avg. Word Count (Unique) <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.averageWordCountUnique ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Number of Unique Keywords" placement="top" :hide-after="50"><span>Keywords <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ activeCube.stats?.uniqueKeywords ?? 0 }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Number of Unique Non-Evergreen Keywords" placement="top" :hide-after="50"><span>Non-Evergreen Keywords <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ activeCube.stats?.uniqueNonEvergreenKeywords ?? 0 }}
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Pricing" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Total Minimum Price of the Cube in USD" placement="top" :hide-after="50"><span>Min Price (USD) <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    ${{ (activeCube.stats?.totalMinPriceUsd ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                                <el-descriptions-item>
                                    <template #label><el-tooltip content="Total Minimum Price of the Cube in MTGO Tix" placement="top" :hide-after="50"><span>Min Price (Tix) <el-icon><InfoFilled /></el-icon></span></el-tooltip></template>
                                    {{ (activeCube.stats?.totalMinPriceTix ?? 0).toFixed(2) }}
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>
                        <el-col :span="24" :xs="24" class="fetched-at-row">
                            <el-text tag="small" type="info">Data fetched: {{ formattedFetchedAt }}</el-text>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane label="Charts">
                    <el-row justify="space-between" class="chart-row" :gutter="20">
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ManaValueChart class="chart" :cmcDistribution="activeCube.stats?.cmcDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ReleaseYearChart
                                    class="chart"
                                    :releaseYearDistribution="activeCube.stats?.releaseYearDistribution || {}"
                                    :averageReleaseYear="activeCube.stats?.averageReleaseYear ?? 0"
                                    :averageReleaseYearStdDev="activeCube.stats?.averageReleaseYearStdDev ?? 0"
                                    :medianReleaseYear="activeCube.stats?.medianReleaseYear ?? 0"
                                    :medianReleaseYearMAD="activeCube.stats?.medianReleaseYearMAD ?? 0"
                                />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ColorIdentityDistributionChart class="chart" :colorDistribution="activeCube.stats?.colorIdentityDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <TypeLineDistributionChart class="chart" :typeLineDistribution="activeCube.stats?.typeLineDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <RarityDistributionChart class="chart" :rarityDistribution="activeCube.stats?.rarityDistribution || {}" :minimumRarityDistribution="activeCube.stats?.minRarityDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <LegalityDistributionChart class="chart" :legalityDistribution="activeCube.stats?.minimumFormatLegalityDistribution || {}" />
                            </div>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane :label="`Keywords (${activeCube.stats?.uniqueKeywords})`">
                    <KeywordTable :keywords="activeCube.stats?.keywords || {}" :totalCards="activeCube.stats?.totalCards || 1" :maxHeight="600" />
                </el-tab-pane>

                <el-tab-pane :label="`Sets (${Object.keys(activeCube.stats?.setCodeDistribution || {}).length})`">
                    <SetNameTable :setCodeDistribution="activeCube.stats?.setCodeDistribution || {}" :totalCards="activeCube.stats?.totalCards || 1" :maxHeight="600" />
                </el-tab-pane>

                <el-tab-pane :label="`Tokens (${activeCube.stats?.uniqueTokenCount ?? 0})`" :lazy="true">
                    <div class="tokens-tab">
                        <div v-for="entry in tokensTabData" :key="entry.tokenId" class="token-entry">
                            <el-image
                                :src="entry.token!.urlFront"
                                fit="contain"
                                class="token-image"
                                lazy
                            >
                                <template #placeholder>
                                    <div class="token-image-placeholder" />
                                </template>
                            </el-image>
                            <div class="token-info">
                                <div class="token-name">
                                    <el-text truncated>{{ entry.token!.name }}</el-text>
                                    <el-tag type="info" size="small" style="margin-left: 6px;">{{ entry.sources.length }}</el-tag>
                                </div>

                                <div class="token-type">{{ entry.token!.typeLine }}</div>
                                <div v-if="entry.token!.power !== undefined" class="token-pt">
                                    {{ entry.token!.power }}/{{ entry.token!.toughness }}
                                </div>
                                <div class="token-sources">
                                    <el-tooltip
                                        v-for="card in entry.sources"
                                        :key="card.oracleId"
                                        effect="light"
                                        placement="right"
                                        :show-after="100"
                                    >
                                        <template #content>
                                            <el-image :src="card.urlFront" fit="contain" :class="['card-image', card.setCode?.toLowerCase()]" style="width: 200px;" />
                                        </template>
                                        <el-link @click="openCardDetailDialog?.(card.oracleId)" class="token-source-name" underline="never">{{ card.name }}</el-link>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>
                        <el-empty v-if="tokensTabData.length === 0" description="No tokens found" />
                    </div>
                </el-tab-pane>

                <el-tab-pane label="Similar Cubes">
                    <SimilarCubesTable
                        :similarityMatrix="similarityMatrix"
                        :loadedCubes="overviewTableData"
                        :cubeId="activeCube.id"
                        :cubeClick="true"
                        :maxHeight="600"
                        @cube-click="switchCube"
                    />
                </el-tab-pane>

                <el-tab-pane label="Clusters" :lazy="true">
                    <ClusterGraphChart :cards="activeCubeCards" :category="cubeCategory" />
                </el-tab-pane>

                <el-tab-pane label="Sample Pack" :lazy="true">
                    <div class="sample-pack">
                        <el-button @click="generateNewPack" style="margin-bottom: 1em;">Generate New Pack</el-button>
                        <div class="sample-pack-image-container">
                            <div class="sample-pack-aspect-box">
                                <el-image
                                    :src="samplePackUrl"
                                    fit="contain"
                                    class="sample-pack-image"
                                >
                                    <template #placeholder>
                                        <el-icon class="is-loading sample-pack-loading"><Loading /></el-icon>
                                    </template>
                                </el-image>
                            </div>
                        </div>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </template>

        <template #footer>
            <el-button @click="$emit('update:visible', false)">Close</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import { useDateFormat } from '@vueuse/core';
import { Loading, InfoFilled, Link } from '@element-plus/icons-vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Cube, CubeCard, SimilarityMatrix } from '../types';
import type { ScryfallToken } from '../types/scryfall';
import { getTokens } from '../util/CubeFunctions';
import ManaValueChart from './charts/basic/ManaValueChart.vue';
import ReleaseYearChart from './charts/basic/ReleaseYearChart.vue';
import ColorIdentityDistributionChart from './charts/distributions/ColorIdentityDistributionChart.vue';
import TypeLineDistributionChart from './charts/distributions/TypeLineDistributionChart.vue';
import RarityDistributionChart from './charts/distributions/RarityDistributionChart.vue';
import LegalityDistributionChart from './charts/distributions/LegalityDistributionChart.vue';
import KeywordTable from './KeywordTable.vue';
import SetNameTable from './SetNameTable.vue';
import SimilarCubesTable from './SimilarCubesTable.vue';
import ClusterGraphChart from './charts/ClusterGraphChart.vue';
import { initCubeCategoryData, classifyCube } from '../util/CubeCategoryDetection';
import { archetypeCardClusters } from '../util/MLArchetypeDetection';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    cubeRow: {
        type: Object as () => Cube | null,
        default: null,
    },
    cubeCards: {
        type: Array as () => CubeCard[],
        default: () => [],
    },
    similarityMatrix: {
        type: Object as () => SimilarityMatrix,
        required: true,
    },
    overviewTableData: {
        type: Array as () => Cube[],
        required: true,
    },
    loadedCubes: {
        type: Object as () => Record<string, Cube>,
        default: () => ({}),
    },
});

defineEmits(['update:visible']);

const openCardDetailDialog = inject<(oracleId: string) => void>('openCardDetailDialog');

const activeCubeId = ref<string | null>(null);

// Reset activeCubeId whenever the dialog opens with a new cube
watch(() => props.cubeRow, (newRow) => {
    activeCubeId.value = newRow?.id || null;
    samplePackSeed.value = Date.now();
});

const activeCube = computed(() => {
    if (!activeCubeId.value) return props.cubeRow;
    return props.overviewTableData.find(c => c.id === activeCubeId.value) || props.cubeRow;
});

const activeCubeCards = computed(() => {
    if (!activeCubeId.value) return props.cubeCards;
    return props.loadedCubes[activeCubeId.value]?.cards || props.cubeCards;
});

const cubeCategory = computed(() => {
    const cards = activeCubeCards.value;
    const clusters = archetypeCardClusters();
    if (!clusters) return null;
    return classifyCube(cards, clusters);
});

initCubeCategoryData();

const switchCube = (cubeId: string) => {
    activeCubeId.value = cubeId;
    samplePackSeed.value = Date.now();
};

const avgSimilarityScore = computed(() => {
    if (!activeCube.value) return 0;
    const scores = props.similarityMatrix[activeCube.value.id] || {};
    const totalCubes = Object.keys(props.loadedCubes).length - 1;
    if (totalCubes === 0) return 0;
    const totalScore = Object.values(scores).reduce((acc: number, c: any) => acc + c.cosineSimilarity, 0);
    return totalScore / totalCubes;
});

const formattedLastModified = computed(() => {
    const ts = activeCube.value?.lastModified;
    if (!ts) return 'N/A';
    return useDateFormat(new Date(ts), 'YYYY-MM-DD').value;
});

const formattedFetchedAt = computed(() => {
    const ts = activeCube.value?.fetchedAt;
    if (!ts) return 'N/A';
    return useDateFormat(new Date(ts), 'YYYY-MM-DD HH:mm').value;
});

const formatPercentage = (value: number | undefined, total: number | undefined) => {
    const v = value ?? 0;
    const t = total ?? 1;
    return ((v / t) * 100).toFixed(2) + '%';
};

const renderedBrief = computed(() => {
    const brief = activeCube.value?.brief;
    if (!brief) return '';
    return DOMPurify.sanitize(marked.parse(brief, { async: false }) as string);
});

// Sample Pack
const samplePackSeed = ref(Date.now());

const samplePackUrl = computed(() => {
    if (!activeCube.value) return '';
    return `https://cubecobra.com/cube/samplepackimage/${activeCube.value.id}/${samplePackSeed.value}`;
});

const generateNewPack = () => {
    samplePackSeed.value = Date.now();
};

// Tokens tab: unique tokens from the active cube, sorted alphabetically, with the cards that produce each
const tokensTabData = computed(() => {
    const tokenMap = getTokens();
    const tokenToCards = new Map<string, CubeCard[]>();

    activeCubeCards.value.forEach(card => {
        (card.tokenOracleIds ?? []).forEach(tokenId => {
            if (!tokenToCards.has(tokenId)) tokenToCards.set(tokenId, []);
            tokenToCards.get(tokenId)!.push(card);
        });
    });

    return Array.from(tokenToCards.entries())
        .map(([tokenId, sources]) => ({
            tokenId,
            token: tokenMap[tokenId] as ScryfallToken | undefined,
            sources,
        }))
        .filter(entry => entry.token !== undefined)
        .sort((a, b) => (a.token!.name).localeCompare(b.token!.name));
});
</script>

<style scoped>
.cube-dialog-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.cube-dialog-name {
    font-size: 1.25rem;
    font-weight: 600;
}

.cube-dialog-separator {
    color: var(--el-text-color-secondary);
}

.cube-dialog-owner {
    font-size: 1rem;
    color: var(--el-text-color-secondary);
}

.cube-dialog-brief {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--el-text-color-secondary);
    line-height: 1.4;

    :deep(p) {
        margin: 0;
    }
}

:deep(.el-tabs__content) {
    min-height: 60vh;
}

.chart-row {
    :deep(.chart) {
        width: unset;
        margin: 0 auto;
    }
}

.sample-pack {
    text-align: center;
}

.sample-pack-image-container {
    display: flex;
    justify-content: center;
}

.sample-pack-aspect-box {
    max-width: 1200px;
    width: 100%;
    aspect-ratio: 2440 / 2040;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sample-pack-image {
    min-height: 25%;
    width: 100%;
}

.sample-pack-loading {
    font-size: 2rem;
    color: var(--el-text-color-secondary);
    padding: 4rem;
}

.details-tab.el-row .el-col {
    padding: 10px;
}

.fetched-at-row {
    padding: 10px;
    padding-top: 4px;
}

.tokens-tab {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding: 8px 0;
}

.token-entry {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.token-image {
    width: 100%;
    aspect-ratio: 745 / 1040;
    border-radius: 4.75% / 3.5%;
    background: var(--el-fill-color-light);
}

.token-image-placeholder {
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
    border-radius: 4.75% / 3.5%;
}

.token-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.token-name {
    font-weight: 600;
    font-size: 13px;

    display: flex;
}

.token-type {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.token-pt {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.token-sources {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 4px;
}

.token-source-name {
    font-size: 12px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    padding: 1px 0;
    justify-content: flex-start;

    &:hover {
        color: var(--el-color-primary);
    }
}

.external-links {
    padding: 10px 0;
}

.external-links a {
    text-decoration: none;
}
</style>
