<template>
    <el-table
        :data="tableData"
        style="width: 100%;"
        :default-sort = "{prop: 'score', order: 'descending'}"
        stripe
    >
        <el-table-column fixed type="index" label="#" width="50" />
        <el-table-column
            prop="name"
            label="Name"
            min-width="180"
            sortable
        >
            <template #default="{ row }">
                <el-link :href="cubeCobraCubeUrl(row)" target="_blank" @click.prevent="openCubeDetailDialog?.(row.id)">{{ row.name }}</el-link>
            </template>
        </el-table-column>
        <el-table-column
            prop="owner"
            label="Owner"
            min-width="120"
            sortable
        >
            <template #default="{ row }">
                <el-link :href="cubeCobraUserUrl(row.ownerId)" target="_blank">{{ row.owner }}</el-link>
            </template>
        </el-table-column>
        <el-table-column
            prop="score"
            label="Cosine Similarity"
            min-width="100"
            :formatter="(row: { score: number }) => (row.score * 100).toFixed(2) + '%'"
            sortable
        />
        <el-table-column
            prop="size"
            label="Size"
            min-width="80"
            sortable
        />
        <el-table-column
            prop="intersection"
            label="Intersection"
            min-width="80"
            sortable
        />
        <el-table-column
            label="Compare"
            min-width="100"
            align="center"
        >
            <template #default="{ row }">
                <el-button size="small" @click="navigateToComparison?.(props.cubeId, row.id)">Compare</el-button>
            </template>
        </el-table-column>
    </el-table>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import type { PropType } from 'vue';
import { displayName } from '../util/Snapshots';
import { cubeCobraCubeUrl, cubeCobraUserUrl } from '../util/ExternalLinks';
import { openCubeDetailDialogKey } from '../types/injectionKeys';
import type { CubeOverviewRow, SimilarityMatrix } from '../types/cube';

const props = defineProps({
    similarityMatrix: {
        type: Object as PropType<SimilarityMatrix>,
        required: true,
    },
    loadedCubes: {
        type: Array as PropType<CubeOverviewRow[]>,
        required: true,
    },
    cubeId: {
        type: String,
        required: true,
    },
});

const openCubeDetailDialog = inject(openCubeDetailDialogKey);
const navigateToComparison = inject<(cubeAId: string, cubeBId: string) => void>('navigateToComparison');

const tableData = computed(() => {
    return mostSimilarCubes(props.cubeId);
});

const mostSimilarCubes = (cubeId: string) => {
    const scores = props.similarityMatrix[cubeId] || {};
    const cubeIndex = new Map(props.loadedCubes.map(cube => [cube.id, cube]));

    return Object.entries(scores)
        .filter(([id]) => cubeIndex.has(id))
        .sort((a, b) => b[1].cosineSimilarity - a[1].cosineSimilarity)
        .map(entry => {
            const otherCube = cubeIndex.get(entry[0])!;

            return {
                id: entry[0],
                score: entry[1].cosineSimilarity,
                intersection: entry[1].insersectionSize,
                name: displayName(otherCube),
                owner: otherCube.owner || 'Unknown',
                ownerId: otherCube.ownerId || '',
                size: otherCube.stats?.totalCards || 0,
            };
        });
};
</script>
