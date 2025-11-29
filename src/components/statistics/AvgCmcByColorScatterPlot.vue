<template>
    <VChart ref="chart" class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
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

let chart = ref<any>(null);

const xDimensions = [
    { name: 'All', key: 'A', color: "#e69d87" },
    { name: 'White', key: 'W', color: "#c0c0c0" },
    { name: 'Blue', key: 'U', color: "#7289ab" },
    { name: 'Black', key: 'B', color: "#5e5e5e" },
    { name: 'Red', key: 'R', color: "#dd6b66" },
    { name: 'Green', key: 'G', color: "#91ca8c" },
    { name: 'Multicolor', key: 'M', color: "#f49f42" },
    { name: 'Colorless', key: 'C', color: "#759aa0" },
];

const series = computed(() => {
    return Object.values(props.loadedCubes).map(cube => {
        return {
            id: cube.id,
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
            colorBy: 'data',
        }
    });
});

// Doing this in stages at least avoids the full recompute of the data points...
// But it's still causing the jitter to shuffle the elements.
const highlightedSeries = computed(() => {
    return series.value.map(s => {
        return {
            ...s,
            itemStyle: {
                opacity: props.highlighted.includes(s.id) ? 1.0 : 0.5,
                borderColor: props.highlighted.includes(s.id) ? '#ffffff' : undefined,
                borderWidth: props.highlighted.includes(s.id) ? 2 : 0,
                shadowBlur: props.highlighted.includes(s.id) ? 10 : 0,
                shadowColor: props.highlighted.includes(s.id) ? 'rgba(255, 255, 255, 0.5)' : undefined,
            },
        };
    });
});

const chartOptions = computed(() => {
    return {
        title: {
            text: 'Avg. Mana Value by Color',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
        },
        color: xDimensions.map(dim => dim.color),
        yAxis: {
            name: 'Avg. Mana Value',
            nameLocation: 'middle',
            type: 'value',
        },
        xAxis: {
            name: 'Color Category',
            nameLocation: 'middle',
            type: 'category',
            jitter: (chart.value?.getWidth() ?? 500) / xDimensions.length * 0.6,
            data: xDimensions.map(dim => dim.name),
        },
        emphasis: {
            focus: 'series',
            itemStyle: {
                opacity: 1.0,
                borderColor: '#ffffff',
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: 'rgba(255, 255, 255, 0.5)',
            },
        },
        series: highlightedSeries.value,
    };
});
</script>
