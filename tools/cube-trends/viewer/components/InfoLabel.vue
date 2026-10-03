<template>
    <el-tooltip :content="tip" placement="top" effect="light">
        <span>{{ label }} <el-icon><InfoFilled /></el-icon></span>
    </el-tooltip>
</template>

<script setup lang="ts">
import { InfoFilled } from '@element-plus/icons-vue';

defineProps<{
    label: string;
    tip: string;
}>();
</script>
