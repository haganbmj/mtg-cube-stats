<template>
    <el-empty :description="reason" />
</template>

<script setup lang="ts">
defineProps<{
    reason: string;
}>();
</script>
