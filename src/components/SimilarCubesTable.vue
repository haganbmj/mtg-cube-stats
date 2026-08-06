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
                <el-link :href="`https://cubecobra.com/cube/about/${externalCubeId(row)}`" target="_blank" @click.prevent="openCubeDetailDialog?.(row.id)">{{ row.name }}</el-link>
            </template>
        </el-table-column>
        <el-table-column
            prop="owner"
            label="Owner"
            min-width="120"
            sortable
        >
            <template #default="{ row }">
                <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
            </template>
        </el-table-column>
        <el-table-column
            prop="score"
            label="Cosine Similarity"
            min-width="100"
            :formatter="(row) => (row.score * 100).toFixed(2) + '%'"
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
import { displayName, externalCubeId } from '../util/Snapshots';
import { openCubeDetailDialogKey } from '../types/injectionKeys';

const props = defineProps({
    similarityMatrix: {
        type: Object,
        required: true,
    },
    loadedCubes: {
        type: Object,
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
    const cubeIndex = new Map(props.loadedCubes.map((cube: any) => [cube.id, cube]));

    return Object.entries(scores)
        .filter(([id]) => cubeIndex.has(id))
        .sort((a, b) => b[1] - a[1])
        .map(entry => {
            const otherCube = cubeIndex.get(entry[0]);

            return {
                id: entry[0],
                score: entry[1].cosineSimilarity,
                intersection: entry[1].insersectionSize,
                name: displayName(otherCube),
                owner: otherCube?.owner || 'Unknown',
                ownerId: otherCube?.ownerId || '',
                size: otherCube?.stats?.totalCards || 0,
            };
        });
};
</script>
