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
            <div v-if="cubeRow" class="cube-dialog-header">
                <el-link :href="`https://cubecobra.com/cube/list/${cubeRow.id}`" target="_blank" type="primary" :underline="false">
                    <span class="cube-dialog-name">{{ cubeRow.name }}</span>
                </el-link>
                <span class="cube-dialog-separator"> &mdash; </span>
                <el-link :href="`https://cubecobra.com/user/view/${cubeRow.ownerId}`" target="_blank" :underline="false">
                    <span class="cube-dialog-owner">{{ cubeRow.owner }}</span>
                </el-link>
            </div>
        </template>

        <template v-if="cubeRow">
            <el-tabs tab-position="top">
                <el-tab-pane label="Charts">
                    <el-row justify="space-between" class="chart-row" :gutter="20">
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ManaValueChart class="chart" :cmcDistribution="cubeRow.stats?.cmcDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ReleaseYearChart class="chart" :releaseYearDistribution="cubeRow.stats?.releaseYearDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ColorIdentityDistributionChart class="chart" :colorDistribution="cubeRow.stats?.colorDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <TypeLineDistributionChart class="chart" :typeLineDistribution="cubeRow.stats?.typeLineDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <RarityDistributionChart class="chart" :rarityDistribution="cubeRow.stats?.rarityDistribution || {}" :minimumRarityDistribution="cubeRow.stats?.minRarityDistribution" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <LegalityDistributionChart class="chart" :legalityDistribution="cubeRow.stats?.minimumFormatLegalityDistribution || {}" />
                            </div>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane :label="`Keywords (${cubeRow.stats.uniqueKeywords})`">
                    <KeywordTable :keywords="cubeRow.stats?.keywords || {}" :totalCards="cubeRow.stats?.totalCards || 1" />
                </el-tab-pane>

                <el-tab-pane :label="`Sets (${Object.keys(cubeRow.stats?.setCodeDistribution || {}).length})`">
                    <SetNameTable :setCodeDistribution="cubeRow.stats?.setCodeDistribution || {}" :totalCards="cubeRow.stats?.totalCards || 1" />
                </el-tab-pane>

                <el-tab-pane label="Similar Cubes">
                    <SimilarCubesTable :similarityMatrix="similarityMatrix" :loadedCubes="overviewTableData" :cubeId="cubeRow.id" />
                </el-tab-pane>

                <el-tab-pane label="Archetypes" :lazy="true">
                    <ArchetypeAnalysis :cubeCards="cubeCards" />
                </el-tab-pane>
            </el-tabs>
        </template>

        <template #footer>
            <el-button @click="$emit('update:visible', false)">Close</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
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

defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    cubeRow: {
        type: Object,
        default: null,
    },
    cubeCards: {
        type: Array,
        default: () => [],
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

defineEmits(['update:visible']);
</script>

<style scoped>
.cube-dialog-header {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.25rem;
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

.chart-row {
    :deep(.chart) {
        width: unset;
        margin: 0 auto;
    }
}
</style>
