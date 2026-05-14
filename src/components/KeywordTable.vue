<template>
    <el-table
        :data="keywords"
        style="width: 100%;"
        :max-height="maxHeight"
        :default-sort = "{prop: 'count', order: 'descending'}"
        stripe
    >
        <el-table-column fixed type="index" label="#" width="50" />
        <el-table-column
            prop="keyword"
            label="Keyword"
            min-width="150"
            sortable
        />
        <el-table-column
            prop="evergreen"
            label="Evergreen"
            min-width="100"
        >
            <template #default="{ row }">
                <el-tag v-if="row.evergreen" type="success" size="small">Yes</el-tag>
                <el-tag v-else type="info" size="small">No</el-tag>
            </template>
        </el-table-column>
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
import { isEvergreenKeyword } from '../util/Keywords';
import { castInensitiveSort } from '../util/HelperFunctions';

const props = defineProps({
    keywords: {
        type: Object,
        required: true,
    },
    totalCards: {
        type: Number,
        required: true,
    },
    maxHeight: {
        type: Number,
        default: 425,
    },
});

const keywords = computed(() => {
    // Note that while the sort here appears backwards, it seems el-table uses the active sort order.
    // So when you do a descending sort on the count column, it should actually reverse this and show as ascending by name.
    return Object.entries(props.keywords).map(([key, value]) => {
        return {
            keyword: key,
            evergreen: isEvergreenKeyword(key),
            count: value,
            percentage: value / props.totalCards,
        };
    }).sort((a, b) => castInensitiveSort(b.keyword, a.keyword));
});
</script>
