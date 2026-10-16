<template>
    <svg :width="width" :height="height" class="sparkline">
        <polyline v-for="(segment, i) in segments" :key="i" :points="segment" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    values: (number | null)[];
    width?: number;
    height?: number;
}>(), {
    width: 80,
    height: 20,
});

const segments = computed(() => {
    const { values, width, height } = props;
    const known = values.filter((v): v is number => v !== null);
    if (known.length === 0) {
        return [];
    }
    const min = Math.min(...known);
    const max = Math.max(...known);
    const range = max - min || 1;
    const step = values.length > 1 ? width / (values.length - 1) : 0;

    const result: string[] = [];
    let current: string[] = [];
    values.forEach((v, i) => {
        if (v === null) {
            if (current.length > 1) {
                result.push(current.join(' '));
            }
            current = [];
            return;
        }
        current.push(`${i * step},${height - ((v - min) / range) * height}`);
    });
    if (current.length > 1) {
        result.push(current.join(' '));
    }
    return result;
});
</script>

<style scoped>
.sparkline {
    display: block;
}
</style>
