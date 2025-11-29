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
    const series = Object.values(props.loadedCubes).map(cube => {
        return {
            name: cube.name,
            data: [[cube.stats.uniqueKeywords, cube.stats.averageWordCountMinusParen]],
            type: 'scatter',
            symbolSize: 10,
            itemStyle: {
                color: props.highlighted.includes(cube.id) ? '#ffffff' : '#5470c6',
                opacity: props.highlighted.includes(cube.id) ? 1.0 : 0.6,
                borderColor: props.highlighted.includes(cube.id) ? '#ffffff' : undefined,
                borderWidth: props.highlighted.includes(cube.id) ? 2 : 0,
                shadowBlur: props.highlighted.includes(cube.id) ? 10 : 0,
                shadowColor: props.highlighted.includes(cube.id) ? 'rgba(255, 255, 255, 0.5)' : undefined,
            },
        }
    });

    const yMin = Math.floor(Math.min(...series.map(s => s.data[0][1])) * 0.9);
    const xMin = Math.floor(Math.min(...series.map(s => s.data[0][0])) * 0.9);

    return {
        title: {
            text: 'Unique Keywords vs Avg. Word Count',
            subtext: 'excluding reminder text',
            subtextStyle: {
                fontStyle: 'italic',
            },
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params: any) {
                return `<b>${params.seriesName}</b><br/>Unique Keywords: ${params.value[0]}<br/>Avg. Word Count: ${params.value[1].toFixed(2)}`;
            },
        },
        xAxis: {
            name: 'Unique Keywords',
            nameLocation: 'middle',
            type: 'value',
            min: xMin,
        },
        yAxis: {
            name: 'Avg. Word Count',
            nameLocation: 'middle',
            type: 'value',
            min: yMin,
        },
        series: series,
    };
});
</script>
