<template>
    <VChart class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    ScatterChart,
]);

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    highlighted: {
        type: Array as () => string[],
        required: true,
    },
});

const chartOptions = computed(() => {
    const series = Object.values(props.loadedCubes).map((cube: any) => ({
        name: cube.name,
        data: [[cube.stats.cardCounts.makesTokens, cube.stats.uniqueTokenCount]],
        type: 'scatter',
        symbolSize: 10,
        itemStyle: {
            color: props.highlighted.includes(cube.id) ? '#ffffff' : '#5470c6',
            opacity: props.highlighted.includes(cube.id) ? 1.0 : 0.6,
            borderColor: props.highlighted.includes(cube.id) ? '#ff6b6b' : undefined,
            borderWidth: props.highlighted.includes(cube.id) ? 2 : 0,
            shadowBlur: props.highlighted.includes(cube.id) ? 5 : 0,
            shadowColor: props.highlighted.includes(cube.id) ? 'rgba(255, 107, 107, 0.5)' : undefined,
        },
    }));

    const xMin = Math.floor(Math.min(...series.map((s: any) => s.data[0][0])) * 0.9);
    const yMin = Math.floor(Math.min(...series.map((s: any) => s.data[0][1])) * 0.9);

    return {
        title: {
            text: 'Token Effects vs Unique Tokens',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (params: any) =>
                `<b>${params.seriesName}</b><br/>Token Effects: ${params.value[0]}<br/>Unique Tokens: ${params.value[1]}`,
        },
        xAxis: {
            name: 'Token Effects',
            nameLocation: 'middle',
            nameGap: 30,
            type: 'value',
            min: xMin,
        },
        yAxis: {
            name: 'Unique Tokens',
            nameLocation: 'middle',
            nameGap: 40,
            type: 'value',
            min: yMin,
        },
        series,
    };
});
</script>
