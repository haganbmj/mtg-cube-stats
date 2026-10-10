<template>
    <el-button :icon="Download" size="small" @click="handleExport">Export CSV</el-button>
</template>

<script setup lang="ts">
import { Download } from '@element-plus/icons-vue';
import { toCsv, downloadText, type CsvColumn } from '../util/csv';

const props = defineProps<{
    filename: string;
    rows: unknown[];
    columns: CsvColumn<any>[];
}>();

function handleExport(): void {
    const csv = toCsv(props.rows, props.columns);
    downloadText(props.filename, csv, 'text/csv;charset=utf-8;');
}
</script>
