<template>
    <svg :width="width" :height="height" class="sparkline">
        <polyline :points="points" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    values: number[];
    width?: number;
    height?: number;
}>(), {
    width: 80,
    height: 20,
});

const points = computed(() => {
    const { values, width, height } = props;
    if (values.length === 0) {
        return '';
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    return values
        .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
        .join(' ');
});
</script>

<style scoped>
.sparkline {
    display: block;
}
</style>
