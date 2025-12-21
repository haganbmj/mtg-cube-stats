<template>
    <el-table
        :data="tableData"
        :default-sort="{ prop: 'count', order: 'descending' }"
        style="width: 100%;"
        table-layout="auto"
        stripe
    >
        <el-table-column
            prop="category"
            label="Category"
            sortable="custom"
        />

        <el-table-column
            prop="count"
            label="Count"
            sortable="custom"
        />

        <el-table-column
            prop="count"
            label="Percentage"
            sortable="custom"
        >
            <template #default="scope">
                {{ ((scope.row.count / tableData.reduce((sum, row) => sum + row.count, 0)) * 100).toFixed(2) }}%
            </template>
        </el-table-column>
        <!-- <el-table-column label="Visual">
            <template #default="scope">
                <el-progress
                    :percentage="(scope.row.count / tableData.reduce((sum, row) => sum + row.count, 0)) * 100"
                    :stroke-width="10"
                    :show-text="false"
                />
            </template>
        </el-table-column> -->
    </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const tableData = computed(() => {
    const categoryCounts = Object.values(props.loadedCubes).reduce((acc, curr) => {
        const category = curr.stats.assumedCategories[0] || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
    }));
});
</script>
