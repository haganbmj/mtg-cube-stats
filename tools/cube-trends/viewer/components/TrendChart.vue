<template>
    <VChart class="trend-chart" :style="{ height: props.height ?? '360px' }" :option="mergedOption" theme="darkbmj" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import darkbmjTheme from '../../../../src/echarts/theme';

const props = defineProps<{
    option: object;
    height?: string;
}>();

const mergedOption = computed(() => ({
    ...props.option,
    useUTC: true,
    toolbox: {
        ...(props.option as any).toolbox,
        feature: {
            ...(props.option as any).toolbox?.feature,
            saveAsImage: {
                pixelRatio: 2,
                backgroundColor: darkbmjTheme.backgroundColor,
                ...(props.option as any).toolbox?.feature?.saveAsImage,
            },
        },
    },
}));
</script>
