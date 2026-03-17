<template>
    <el-table
        :data="setNames"
        style="width: 100%;"
        max-height="425"
        :default-sort = "{prop: 'count', order: 'descending'}"
    >
        <el-table-column fixed type="index" label="#" width="50" />
        <el-table-column
            prop="setCode"
            label="Set Code"
            min-width="80"
            sortable
        />
        <el-table-column
            prop="setName"
            label="Set Name"
            min-width="200"
            sortable
        />
        <el-table-column
            prop="count"
            label="Count"
            min-width="100"
            sortable
        />
        <el-table-column
            prop="percentage"
            label="Percentage"
            min-width="140"
            :formatter="(row) => (row.percentage * 100).toFixed(2) + '%'"
            sortable
        />
    </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { castInensitiveSort } from '../util/HelperFunctions';
import { getSetName } from '../util/CubeFunctions';

const props = defineProps({
    setCodeDistribution: {
        type: Object,
        required: true,
    },
    totalCards: {
        type: Number,
        required: true,
    },
});

const setNames = computed(() => {
    // Note that while the sort here appears backwards, it seems el-table uses the active sort order.
    // So when you do a descending sort on the count column, it should actually reverse this and show as ascending by name.
    return Object.entries(props.setCodeDistribution).map(([key, value]) => {
        return {
            setCode: key,
            setName: getSetName(key),
            count: value,
            percentage: value / props.totalCards,
        };
    }).sort((a, b) => castInensitiveSort(b.setName, a.setName));
});
</script>
