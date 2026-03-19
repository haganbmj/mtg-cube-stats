<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="$emit('update:visible', $event)"
        width="90%"
        top="5vh"
        align-center
        destroy-on-close
    >
        <template #header>
            <div v-if="activeCube" class="cube-dialog-header">
                <el-image :src="activeCube.thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                <el-link :href="`https://cubecobra.com/cube/list/${activeCube.id}`" target="_blank" type="primary" underline="never">
                    <span class="cube-dialog-name">{{ activeCube.name }}</span>
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
                    <el-row class="details-tab">
                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Core" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item label="Total Cards">{{ activeCube.stats?.totalCards ?? 0 }}</el-descriptions-item>
                                <el-descriptions-item label="Last Modified">{{ formattedLastModified }}</el-descriptions-item>
                                <el-descriptions-item label="Followers">{{ activeCube.followerCount ?? 0 }}</el-descriptions-item>
                                <el-descriptions-item label="Categories">
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
                                <el-descriptions-item label="Arena Playable">
                                    <el-tag :type="activeCube.stats?.arenaPlayable ? 'success' : 'danger'" size="default">{{ activeCube.stats?.arenaPlayable ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item label="MTGO Playable">
                                    <el-tag :type="activeCube.stats?.mtgoPlayable ? 'success' : 'danger'" size="default">{{ activeCube.stats?.mtgoPlayable ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item label="Paper Playable">
                                    <el-tag :type="activeCube.stats?.paperPlayable ? 'success' : 'danger'" size="default">{{ activeCube.stats?.paperPlayable ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item label="Graveyard Order Matters">
                                    <el-tag :type="activeCube.stats?.graveyardOrderMatters ? 'warning' : 'info'" size="default">{{ activeCube.stats?.graveyardOrderMatters ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Card Counts" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item label="New Cards">
                                    {{ formatPercentage(activeCube.stats?.newCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.newCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Singleton">
                                    {{ formatPercentage(activeCube.stats?.singletonCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.singletonCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Lands">
                                    {{ formatPercentage(activeCube.stats?.landCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.landCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Creatures">
                                    {{ formatPercentage(activeCube.stats?.creatureCards, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.creatureCards ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Removal">
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.removal, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.removal ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Makes Tokens">
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.makesTokens, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.makesTokens ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Abnormal Layout">
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.abnormalLayout, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.abnormalLayout ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Universes Beyond">
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.universesBeyond, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.universesBeyond ?? 0 }})</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Supplemental Product">
                                    {{ formatPercentage(activeCube.stats?.cardCounts?.supplementalProduct, activeCube.stats?.totalCards) }}
                                    <span class="cell-secondary">({{ activeCube.stats?.cardCounts?.supplementalProduct ?? 0 }})</span>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Summary Stats" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item label="Avg. Similarity">{{ formatPercentage(avgSimilarityScore, 1) }}</el-descriptions-item>
                                <el-descriptions-item label="Avg. Mana Value">{{ (activeCube.stats?.averageNonLandCmc ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Avg. Card Elo">{{ (activeCube.stats?.averageElo ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Avg. Card Popularity">{{ (activeCube.stats?.averagePopularity ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Rarity Score">{{ (activeCube.stats?.blendedRarityScore ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Avg. Release Year">{{ Math.round(activeCube.stats?.averageReleaseYear ?? 0) }}</el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Characteristics" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item label="Avg. Word Count">{{ (activeCube.stats?.averageWordCount ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Avg. Word Count Excl. Reminder">{{ (activeCube.stats?.averageWordCountMinusParen ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Keywords">{{ activeCube.stats?.uniqueKeywords ?? 0 }}</el-descriptions-item>
                                <el-descriptions-item label="Non-Evergreen Keywords">{{ activeCube.stats?.uniqueNonEvergreenKeywords ?? 0 }}</el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Pricing" :column="1" :label-width="240" :border="true" size="default">
                                <el-descriptions-item label="Min Price (USD)">${{ (activeCube.stats?.totalMinPriceUsd ?? 0).toFixed(2) }}</el-descriptions-item>
                                <el-descriptions-item label="Min Price (Tix)">{{ (activeCube.stats?.totalMinPriceTix ?? 0).toFixed(2) }}</el-descriptions-item>
                            </el-descriptions>
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
                                <ReleaseYearChart class="chart" :releaseYearDistribution="activeCube.stats?.releaseYearDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ColorIdentityDistributionChart class="chart" :colorDistribution="activeCube.stats?.colorDistribution || {}" />
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

                <el-tab-pane label="Themes" :lazy="true">
                    <ArchetypeAnalysis :cubeCards="activeCubeCards" />
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
import { ref, computed, watch } from 'vue';
import { useDateFormat } from '@vueuse/core';
import { Loading } from '@element-plus/icons-vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Cube, CubeCard, SimilarityMatrix } from '../types';
import ManaValueChart from './charts/basic/ManaValueChart.vue';
import ReleaseYearChart from './charts/basic/ReleaseYearChart.vue';
import ColorIdentityDistributionChart from './charts/distributions/ColorIdentityDistributionChart.vue';
import TypeLineDistributionChart from './charts/distributions/TypeLineDistributionChart.vue';
import RarityDistributionChart from './charts/distributions/RarityDistributionChart.vue';
import LegalityDistributionChart from './charts/distributions/LegalityDistributionChart.vue';
import KeywordTable from './KeywordTable.vue';
import SetNameTable from './SetNameTable.vue';
import SimilarCubesTable from './SimilarCubesTable.vue';
import ArchetypeAnalysis from './ArchetypeAnalysis.vue';

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

const formattedLastModified = computed(() => {
    const ts = activeCube.value?.lastModified;
    if (!ts) return 'N/A';
    return useDateFormat(new Date(ts), 'YYYY-MM-DD').value;
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
</style>
