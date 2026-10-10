<template>
    <span class="signed-value" :class="direction ? `signed-value--${direction}` : undefined">
        <el-icon v-if="direction === 'up'" class="signed-value-icon"><CaretTop /></el-icon>
        <el-icon v-else-if="direction === 'down'" class="signed-value-icon"><CaretBottom /></el-icon>
        {{ text }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CaretTop, CaretBottom } from '@element-plus/icons-vue';
import { trendDirection } from '../util/format';

const props = defineProps<{
    value: number | null;
    text: string;
}>();

const direction = computed(() => trendDirection(props.value, props.text));
</script>

<style scoped>
.signed-value {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
}

.signed-value--up {
    color: #67C23A;
}

.signed-value--down {
    color: #F56C6C;
}
</style>
