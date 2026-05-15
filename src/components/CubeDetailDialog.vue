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
            <div v-if="activeCube" class="cube-dialog-meta">
                <span class="cube-dialog-meta-item">Cards: <strong>{{ activeCube.stats?.totalCards ?? 0 }}</strong></span>
                <span class="cube-dialog-meta-item">Followers: <strong>{{ activeCube.followerCount ?? 0 }}</strong></span>
                <span class="cube-dialog-meta-item">Modified: <strong>{{ formattedLastModified }}</strong></span>
                <span class="cube-dialog-meta-item">
                    Categories:
                    <el-tooltip
                        v-for="category in (activeCube.stats?.assumedCategories || [])"
                        :key="category"
                        :content="getCategoryTooltip(category)"
                        placement="top"
                        :hide-after="50"
                    >
                        <el-tag
                            size="default"
                            effect="dark"
                            :color="getCategoryTagColor(category)"
                            style="margin-left: 0.25rem;"
                            disable-transitions
                        >
                            {{ category }}
                        </el-tag>
                        <span v-if="!(activeCube.stats?.assumedCategories || []).length">&mdash;</span>
                    </el-tooltip></span>
            </div>
            <div v-if="activeCube?.brief" class="cube-dialog-brief" v-html="renderedBrief"></div>
        </template>

        <template v-if="activeCube">
            <el-tabs tab-position="top">
                <el-tab-pane label="Details">
                    <el-row>
                        <el-col :span="24">
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
                        <el-col :span="24">
                            <h4 class="stat-section-title">Card Counts</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.totalUniqueCards, activeCube.stats?.totalCards) }}
                                        </div>
                                        <div class="stat-label">Unique Cards <span class="stat-secondary">({{ activeCube.stats?.totalUniqueCards ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.newCards, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.newCardRatio" />
                                        </div>
                                        <div class="stat-label">New Cards <span class="stat-secondary">({{ activeCube.stats?.newCards ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-land ms-2x stat-icon" style="color: #e6a23c;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.landCards, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.landRatio" />
                                        </div>
                                        <div class="stat-label">Lands <span class="stat-secondary">({{ activeCube.stats?.landCards ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-creature ms-2x stat-icon" style="color: #67c23a;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.creatureCards, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.creatureRatio" />
                                        </div>
                                        <div class="stat-label">Creatures <span class="stat-secondary">({{ activeCube.stats?.creatureCards ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-instant ms-2x stat-icon" style="color: #f56c6c;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.cardCounts?.removal, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.removalRatio" />
                                        </div>
                                        <div class="stat-label">Removal <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.removal ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-token ms-2x stat-icon" style="color: #909399;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.cardCounts?.makesTokens, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.makesTokensRatio" />
                                        </div>
                                        <div class="stat-label">Makes Tokens <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.makesTokens ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-token ms-2x stat-icon" style="color: #a3d977;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ activeCube.stats?.uniqueTokenCount ?? 0 }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.uniqueTokenCount" />
                                        </div>
                                        <div class="stat-label">Unique Tokens</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-dfc-front ms-2x stat-icon" style="color: #b4a7d6;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.cardCounts?.abnormalLayout, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.abnormalLayoutRatio" />
                                        </div>
                                        <div class="stat-label">Abnormal Layout <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.abnormalLayout ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.cardCounts?.universesBeyond, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.universesBeyondRatio" />
                                        </div>
                                        <div class="stat-label">Universes Beyond <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.universesBeyond ?? 0 }})</span></div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(activeCube.stats?.cardCounts?.supplementalProduct, activeCube.stats?.totalCards) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.supplementalProductRatio" />
                                        </div>
                                        <div class="stat-label">Supplemental Product <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.supplementalProduct ?? 0 }})</span></div>
                                    </div>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24">
                            <h4 class="stat-section-title">Summary Stats</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ formatPercentage(avgSimilarityScore, 1) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.avgSimilarityScore" />
                                        </div>
                                        <div class="stat-label">Avg. Similarity</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-c ms-2x stat-icon" style="color: #909399;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ (activeCube.stats?.averageNonLandCmc ?? 0).toFixed(2) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.averageNonLandCmc" />
                                        </div>
                                        <div class="stat-label">Avg. Mana Value</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ (activeCube.stats?.averageElo ?? 0).toFixed(2) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.averageElo" />
                                        </div>
                                        <div class="stat-label">Avg. Card Elo</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ (activeCube.stats?.averagePopularity ?? 0).toFixed(2) }} %
                                            <StatCmpIndicator :comparison="activeCubeComparisons.averagePopularity" />
                                        </div>
                                        <div class="stat-label">Avg. Card Popularity</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-rarity ms-2x stat-icon" style="color: #e6a23c;"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ (activeCube.stats?.blendedRarityScore ?? 0).toFixed(2) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.blendedRarityScore" />
                                        </div>
                                        <div class="stat-label">Rarity Score</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ Math.round(activeCube.stats?.averageReleaseYear ?? 0) }} <span class="stat-secondary">(±{{ (activeCube.stats?.averageReleaseYearStdDev ?? 0).toFixed(1) }})</span>
                                            <StatCmpIndicator :comparison="activeCubeComparisons.averageReleaseYear" />
                                        </div>
                                        <div class="stat-label">Avg. Release Year</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ Math.round(activeCube.stats?.medianReleaseYear ?? 0) }} <span class="stat-secondary">(±{{ (activeCube.stats?.medianReleaseYearMAD ?? 0).toFixed(1) }})</span>
                                            <StatCmpIndicator :comparison="activeCubeComparisons.medianReleaseYear" />
                                        </div>
                                        <div class="stat-label">Median Release Year</div>
                                    </div>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24">
                            <h4 class="stat-section-title">Characteristics</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ (activeCube.stats?.averageWordCount ?? 0).toFixed(2) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.averageWordCount" />
                                        </div>
                                        <div class="stat-label">Avg. Word Count</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ (activeCube.stats?.averageWordCountUnique ?? 0).toFixed(2) }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.averageWordCountUnique" />
                                        </div>
                                        <div class="stat-label">Avg. Word Count (Unique)</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ activeCube.stats?.uniqueKeywords ?? 0 }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.uniqueKeywords" />
                                        </div>
                                        <div class="stat-label">Keywords</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">
                                            {{ activeCube.stats?.uniqueNonEvergreenKeywords ?? 0 }}
                                            <StatCmpIndicator :comparison="activeCubeComparisons.uniqueNonEvergreenKeywords" />
                                        </div>
                                        <div class="stat-label">Non-Evergreen Keywords</div>
                                    </div>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24">
                            <h4 class="stat-section-title">Pricing</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">${{ (activeCube.stats?.totalMinPriceUsd ?? 0).toFixed(2) }}</div>
                                        <div class="stat-label">Min Price (USD)</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <div>
                                        <div class="stat-value">{{ (activeCube.stats?.totalMinPriceTix ?? 0).toFixed(2) }}</div>
                                        <div class="stat-label">Min Price (Tix)</div>
                                    </div>
                                </div>
                            </div>
                        </el-col>
                        <el-col :span="24" v-if="activeCube.stats?.graveyardOrderMatters">
                            <div class="graveyard-warning">
                                ⚠️ This cube contains cards that care about Graveyard Order
                            </div>
                        </el-col>
                        <el-col :span="24">
                            <div class="playability-row">
                                <span class="playability-tag" :class="activeCube.stats?.arenaPlayable ? 'playable' : 'not-playable'">Arena</span>
                                <span class="playability-tag" :class="activeCube.stats?.mtgoPlayable ? 'playable' : 'not-playable'">MTGO</span>
                                <span class="playability-tag" :class="activeCube.stats?.paperPlayable ? 'playable' : 'not-playable'">Paper</span>
                            </div>
                        </el-col>
                        <el-col :span="24" class="fetched-at-row">
                            <el-text tag="small" type="info">Data fetched: {{ formattedFetchedAt }}</el-text>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane label="List" :lazy="true">
                    <CubeListView :cards="activeCubeCards" />
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
                                <TypeLineDistributionChart class="chart" :primaryTypeDistribution="activeCube.stats?.primaryTypeDistribution || {}" />
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
                                        popper-class="card-tooltip"
                                        :show-after="50"
                                        :hide-after="50"
                                    >
                                        <template #content>
                                            <el-image :src="card.urlFront" fit="contain" :class="['card-image', card.setCode?.toLowerCase()]" />
                                        </template>
                                        <el-link @click="openCardDetailDialog?.(card.oracleId)" class="token-source-name" underline="never">{{ card.name }}</el-link>
                                    </el-tooltip></div>
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

                <!-- <el-tab-pane label="Themes" :lazy="true">
                    <ArchetypeAnalysis :cubeCards="activeCubeCards" />
                </el-tab-pane> -->

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
import { Loading, Link } from '@element-plus/icons-vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Cube, CubeCard, SimilarityMatrix } from '../types';
import type { ScryfallToken } from '../types/scryfall';
import { getTokens } from '../util/CubeFunctions';
import { getCategoryTagColor, getCategoryTooltip } from '../util/CubeCategories';
import ManaValueChart from './charts/basic/ManaValueChart.vue';
import ReleaseYearChart from './charts/basic/ReleaseYearChart.vue';
import ColorIdentityDistributionChart from './charts/distributions/ColorIdentityDistributionChart.vue';
import TypeLineDistributionChart from './charts/distributions/TypeLineDistributionChart.vue';
import RarityDistributionChart from './charts/distributions/RarityDistributionChart.vue';
import LegalityDistributionChart from './charts/distributions/LegalityDistributionChart.vue';
import KeywordTable from './KeywordTable.vue';
import SetNameTable from './SetNameTable.vue';
import StatCmpIndicator from './StatCmpIndicator.vue';
import SimilarCubesTable from './SimilarCubesTable.vue';
import CubeListView from './CubeListView.vue';

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
    peerStats: {
        type: Object as () => Record<string, { mean: number; stddev: number }> | null,
        default: null,
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

// --- Peer comparison ---
type ComparisonResult = 'high' | 'low';

const cmp = (value: number, key: string): ComparisonResult | null => {
    if (!props.peerStats) return null;
    const s = props.peerStats[key];
    if (!s || s.stddev === 0) return null;
    if (value > s.mean + s.stddev) return 'high';
    if (value < s.mean - s.stddev) return 'low';
    return null;
};

const activeCubeComparisons = computed((): Record<string, ComparisonResult | null> => {
    const cube = activeCube.value;
    if (!cube || !props.peerStats) return {};
    const stats = cube.stats;
    const t = stats?.totalCards || 1;
    return {
        newCardRatio:               cmp((stats?.newCards ?? 0) / t, 'newCardRatio'),
        landRatio:                  cmp((stats?.landCards ?? 0) / t, 'landRatio'),
        creatureRatio:              cmp((stats?.creatureCards ?? 0) / t, 'creatureRatio'),
        removalRatio:               cmp((stats?.cardCounts?.removal ?? 0) / t, 'removalRatio'),
        makesTokensRatio:           cmp((stats?.cardCounts?.makesTokens ?? 0) / t, 'makesTokensRatio'),
        abnormalLayoutRatio:        cmp((stats?.cardCounts?.abnormalLayout ?? 0) / t, 'abnormalLayoutRatio'),
        universesBeyondRatio:       cmp((stats?.cardCounts?.universesBeyond ?? 0) / t, 'universesBeyondRatio'),
        supplementalProductRatio:   cmp((stats?.cardCounts?.supplementalProduct ?? 0) / t, 'supplementalProductRatio'),
        uniqueTokenCount:           cmp((stats?.uniqueTokenCount ?? 0) / t, 'uniqueTokenCount'),
        avgSimilarityScore:         cmp(avgSimilarityScore.value, 'avgSimilarityScore'),
        averageNonLandCmc:          cmp(stats?.averageNonLandCmc ?? 0, 'averageNonLandCmc'),
        averageElo:                 cmp(stats?.averageElo ?? 0, 'averageElo'),
        averagePopularity:          cmp(stats?.averagePopularity ?? 0, 'averagePopularity'),
        blendedRarityScore:         cmp(stats?.blendedRarityScore ?? 0, 'blendedRarityScore'),
        averageReleaseYear:         cmp(stats?.averageReleaseYear ?? 0, 'averageReleaseYear'),
        medianReleaseYear:          cmp(stats?.medianReleaseYear ?? 0, 'medianReleaseYear'),
        averageWordCount:           cmp(stats?.averageWordCount ?? 0, 'averageWordCount'),
        averageWordCountUnique:     cmp(stats?.averageWordCountUnique ?? 0, 'averageWordCountUnique'),
        uniqueKeywords:             cmp((stats?.uniqueKeywords ?? 0) / t, 'uniqueKeywords'),
        uniqueNonEvergreenKeywords: cmp((stats?.uniqueNonEvergreenKeywords ?? 0) / t, 'uniqueNonEvergreenKeywords'),
    };
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

.cube-dialog-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 4px;
    font-size: 0.8rem;
    color: var(--el-text-color-secondary);
}

.cube-dialog-meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.cube-dialog-meta-item strong {
    color: var(--el-text-color-primary);
    font-weight: 500;
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
    padding: 10px 0;
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

    @media (max-width: 760px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
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

.stat-section-title {
    color: var(--el-text-color-regular);
    margin-bottom: 12px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.stat-icon {
    flex-shrink: 0;
    width: 24px;
    text-align: center;
    opacity: 0.8;
}

.stat-icon-fallback {
    opacity: 0.5;
    color: var(--el-text-color-secondary);
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--el-text-color-primary);
}

.stat-label {
    font-size: 0.7rem;
    color: var(--el-text-color-secondary);
}

.stat-secondary {
    font-size: 0.68rem;
    color: var(--el-text-color-placeholder);
}

.graveyard-warning {
    background: rgba(230, 162, 60, 0.1);
    border: 1px solid rgba(230, 162, 60, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.8rem;
    color: var(--el-color-warning);
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.playability-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 0;
    margin-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.playability-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}

.playability-tag.playable {
    background: rgba(103, 194, 58, 0.15);
    color: #67c23a;
}

.playability-tag.not-playable {
    background: rgba(245, 108, 108, 0.15);
    color: #f56c6c;
}
</style>
