<template>
    <el-tooltip
        v-if="comparison"
        :content="comparison === 'high' ? 'Higher than typical among loaded cubes' : 'Lower than typical among loaded cubes'"
        placement="top"
        :hide-after="50"
    >
        <span :class="['stat-cmp', 'stat-cmp--' + comparison]">{{ comparison === 'high' ? '▲' : '▼' }}</span>
    </el-tooltip>
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
    font-size: 0.7em;
    margin-left: 3px;
    cursor: default;
    user-select: none;
    vertical-align: middle;
}

.stat-cmp--high {
    color: var(--el-color-warning);
}

.stat-cmp--low {
    color: var(--el-color-primary);
}
</style>
