<template>
    <div style="width: 100%;">
        <CardSummaryTable :loaded-cubes="loadedCubes" :similarity-matrix="similarityMatrix" :overview-table-data="overviewTableData" />
    </div>
</template>

<script setup lang="ts">
import CardSummaryTable from '../components/CardSummaryTable.vue';

defineProps({
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
});
</script>
