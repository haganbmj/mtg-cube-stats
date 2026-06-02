<template>
    <div style="width: 100%;">
        <!-- Loading state -->
        <div v-if="props.loadingProgress?.active || !scryfallReady" style="padding: 40px; text-align: center;">
            <el-text v-if="!scryfallReady" type="info" style="display: block; margin-bottom: 12px;">Loading card data&hellip;</el-text>
            <template v-if="props.loadingProgress?.active">
                <el-text type="info" style="display: block; margin-bottom: 12px;">Loading cubes...</el-text>
                <el-progress
                    :percentage="props.loadingProgress.total > 0 ? Math.round((props.loadingProgress.loaded / props.loadingProgress.total) * 100) : 0"
                    :format="() => `${props.loadingProgress!.loaded} / ${props.loadingProgress!.total}`"
                />
            </template>
        </div>

        <!-- Normal content -->
        <CardSummaryTable v-else :loaded-cubes="loadedCubes" :similarity-matrix="similarityMatrix" :overview-table-data="overviewTableData" />
    </div>
</template>

<script setup lang="ts">
import CardSummaryTable from '../components/CardSummaryTable.vue';
import { scryfallReady } from '../util/CubeFunctions';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    similarityMatrix: {
        type: Object,
        required: true,
    },
    overviewTableData: {
        type: Array,
        required: true,
    },
    loadingProgress: {
        type: Object as () => { active: boolean; loaded: number; total: number } | null,
        default: null,
    },
});
</script>
