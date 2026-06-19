<template>
    <span
        v-if="comparison"
        :class="['stat-cmp', 'stat-cmp--' + comparison]"
    >{{ comparison === 'high' ? '▲' : '▼' }}</span>
</template>

<script setup lang="ts">
defineProps({
    comparison: {
        type: String as () => 'high' | 'low' | null,
        default: null,
    },
});
</script>

<style scoped>
.stat-cmp {
    font-size: 0.55em;
    margin-left: 2px;
    cursor: default;
    user-select: none;
    vertical-align: middle;
    opacity: 0.7;
}

.stat-cmp--high {
    color: var(--el-color-warning);
}

.stat-cmp--low {
    color: var(--el-color-primary);
}
</style>
