<template>
    <el-table
        :data="keywords"
        style="width: 100%;"
        max-height="775"
        :default-sort = "{prop: 'count', order: 'descending'}"
    >
        <el-table-column fixed type="index" label="#" width="50" />
        <el-table-column
            prop="keyword"
            label="Keyword"
            min-width="180"
            sortable
        />
        <el-table-column
            prop="count"
            label="Count"
            width="100"
            sortable
        />
        <el-table-column
            prop="percentage"
            label="Percentage"
            width="140"
            :formatter="(row) => (row.percentage * 100).toFixed(2) + '%'"
            sortable
        />
    </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    keywords: {
        type: Object,
        required: true,
    },
    totalCards: {
        type: Number,
        required: true,
    },
});

const keywords = computed(() => {
    return Object.entries(props.keywords).map(([key, value]) => {
        return { keyword: key, count: value, percentage: value / props.totalCards };
    });
});
</script>
