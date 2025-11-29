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
});

const xDimensions = [
    { name: 'All', key: 'A', color: '#808080' },
    { name: 'White', key: 'W', color: '#FFFF00' },
    { name: 'Blue', key: 'U', color: '#0000FF' },
    { name: 'Black', key: 'B', color: '#000000' },
    { name: 'Red', key: 'R', color: '#FF0000' },
    { name: 'Green', key: 'G', color: '#00FF00' },
    { name: 'Multicolor', key: 'M', color: '#800080' },
    { name: 'Colorless', key: 'C', color: '#C0C0C0' },
];

const chartOptions = computed(() => {
    const series = Object.values(props.loadedCubes).map(cube => {
        return {
            name: cube.name,
            data: xDimensions.map(dim => {
                if (dim.key === 'A') {
                    return [
                        dim.name,
                        cube.stats.averageNonLandCmc,
                        Math.random(),
                    ];
                }

                return [
                    dim.name,
                    cube.stats.cmcByStrictColor[dim.key] != undefined ? (cube.stats.cmcByStrictColor[dim.key].totalCmc / cube.stats.cmcByStrictColor[dim.key].count) : undefined,
                    Math.random(),
                ];
            }),
            type: 'scatter',
            symbolSize: 10,
            colorBy: 'data', // TODO: Figure out how to color by xAxis dimension.
            itemStyle: {
                opacity: 0.4,
            },
        }
    });

    return {
        title: {
            text: 'Avg. Mana Value by Color',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            // formatter: function(params: any) {
            //     return `<b>${params.seriesName}</b><br/>Unique Keywords: ${params.value[0]}<br/>Avg. Word Count: ${params.value[1].toFixed(2)}`;
            // },
        },
        yAxis: {
            name: 'Avg. Mana Value',
            nameLocation: 'middle',
            type: 'value',
        },
        xAxis: {
            name: 'Color',
            nameLocation: 'middle',
            type: 'category',
            jitter: 40, // TODO: Looks like to do this properly you need to derive the current width of the chart then set a jitter to fit.
            data: xDimensions.map(dim => dim.name),
        },
        series: series,
    };
});
</script>
