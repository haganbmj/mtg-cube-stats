<template>
    <el-dialog
        :model-value="visible"
        :modal="modal"
        width="90%"
        style="max-width: 1900px;"
        top="5vh"
        align-center
        :show-close="false"
        :before-close="() => $emit('close')"
    >
        <CubeDetailView
            :cubeRow="cubeRow"
            :cubeCards="cubeCards"
            :similarityMatrix="similarityMatrix"
            :overviewTableData="overviewTableData"
            :loadedCubes="loadedCubes"
            :peerStats="peerStats"
            :context="'dialog'"
            v-model:activeTab="activeTab"
            v-model:searchQuery="searchQuery"
            @select-cube="onSelectCube"
            @close="$emit('close')"
        />
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import type { Cube, CubeCard, CubeOverviewRow, SimilarityMatrix } from '../types';
import { openCubeDetailDialogKey } from '../types/injectionKeys';
import CubeDetailView from './CubeDetailView.vue';

defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    modal: {
        type: Boolean,
        default: true,
    },
    cubeRow: {
        type: Object as () => CubeOverviewRow | null,
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
        type: Array as () => CubeOverviewRow[],
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

defineEmits(['close']);

const activeTab = ref('details');
const searchQuery = ref('');

// In the dialog, cube-to-cube links push another modal (unchanged behavior).
const openCubeDetailDialog = inject(openCubeDetailDialogKey);
const onSelectCube = (id: string) => openCubeDetailDialog?.(id);
</script>
