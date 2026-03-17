<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="$emit('update:visible', $event)"
        :title="cubeRow?.name || 'Cube Details'"
        width="90%"
        top="5vh"
        align-center
        destroy-on-close
    >
        <template v-if="cubeRow">
            <el-row :gutter="10">
                <el-col :span="24">
                    <el-row justify="space-between" class="chart-row" :gutter="20" style="margin-top: 1em;">
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
                </el-col>
                <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                    <h3>Keywords ({{ cubeRow.stats.uniqueKeywords }})</h3>
                    <KeywordTable :keywords="cubeRow.stats?.keywords || {}" :totalCards="cubeRow.stats?.totalCards || 1" />
                </el-col>
                <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                    <h3>Sets ({{ Object.keys(cubeRow.stats?.setCodeDistribution || {}).length }})</h3>
                    <SetNameTable :setCodeDistribution="cubeRow.stats?.setCodeDistribution || {}" :totalCards="cubeRow.stats?.totalCards || 1" />
                </el-col>
                <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                    <h3>Similar Cubes</h3>
                    <SimilarCubesTable :similarityMatrix="similarityMatrix" :loadedCubes="overviewTableData" :cubeId="cubeRow.id" />
                </el-col>
            </el-row>
            <el-row :gutter="10" style="margin-top: 20px;">
                <el-col :span="24">
                    <h3>Supported Archetypes</h3>
                    <ArchetypeAnalysis :cubeCards="cubeCards" />
                </el-col>
            </el-row>
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
.chart-row {
    :deep(.chart) {
        width: unset;
        margin: 0 auto;
    }
}
</style>
