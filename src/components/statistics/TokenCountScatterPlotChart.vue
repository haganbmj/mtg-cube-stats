<template>
    <VChart class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { ScatterChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    ScatterChart,
    LineChart,
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
    const series: any[] = Object.values(props.loadedCubes).map((cube: any) => ({
        name: cube.name,
        data: [[cube.stats.uniqueTokenCount, cube.stats.cardCounts.makesTokens]],
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

    const xMax = Math.ceil(Math.max(...series.map((s: any) => s.data[0][0])) * 1.05);
    const yMax = Math.ceil(Math.max(...series.map((s: any) => s.data[0][1])) * 1.05);
    // const refMax = Math.max(xMax, yMax);

    const referenceLine = {
        name: 'y = x',
        type: 'line',
        data: [[0, 0], [xMax, xMax]],
        showSymbol: false,
        silent: true,
        lineStyle: {
            type: 'dashed',
            color: 'rgba(255, 255, 255, 0.25)',
            width: 1,
        },
    };

    return {
        title: {
            text: 'Unique Tokens vs Token Effects',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                if (params.seriesName === 'y = x') return '';
                return `<b>${params.seriesName}</b><br/>Unique Tokens: ${params.value[0]}<br/>Token Effects: ${params.value[1]}`;
            },
        },
        xAxis: {
            name: 'Unique Tokens',
            nameLocation: 'middle',
            nameGap: 30,
            type: 'value',
            min: 0,
        },
        yAxis: {
            name: 'Token Effects',
            nameLocation: 'middle',
            nameGap: 40,
            type: 'value',
            min: 0,
        },
        series: [...series, referenceLine],
    };
});
</script>
