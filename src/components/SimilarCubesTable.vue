<template>
    <el-table
        :data="tableData"
        style="width: 100%;"
        max-height="425"
        :default-sort = "{prop: 'score', order: 'descending'}"
    >
        <el-table-column fixed type="index" label="#" width="50" />
        <el-table-column
            prop="name"
            label="Name"
            min-width="180"
            sortable
        >
            <template #default="{ row }">
                <el-tooltip :content="`Owner: ${row.owner}`" placement="top" :hide-after="50">
                    <el-link :href="`https://cubecobra.com/cube/list/${row.id}`" target="_blank">{{ row.name }}</el-link>
                </el-tooltip>
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
    </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

const tableData = computed(() => {
    return mostSimilarCubes(props.cubeId);
});

const mostSimilarCubes = (cubeId: string) => {
    const scores = props.similarityMatrix[cubeId] || {};

    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(entry => {
            const otherCube = props.loadedCubes.filter(cube => cube.id === entry[0])[0];

            return {
                id: entry[0],
                score: entry[1].cosineSimilarity,
                intersection: entry[1].insersectionSize,
                name: otherCube?.name || 'Unknown',
                owner: otherCube?.owner || 'Unknown',
                size: otherCube?.stats?.totalCards || 0,
            };
        });
};
</script>
