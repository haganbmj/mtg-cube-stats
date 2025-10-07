<template>
    <el-table
        :data="keywords"
        style="width: 100%;"
        :default-sort = "{prop: 'count', order: 'descending'}"
    >
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
    </el-table>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    keywords: {
        type: Object,
        required: true,
    }
});

const keywords = computed(() => {
    return Object.entries(props.keywords).map(([key, value]) => {
        return { keyword: key, count: value };
    });
});
</script>
