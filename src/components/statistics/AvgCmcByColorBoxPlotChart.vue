<template>
    <VChart ref="chart" class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { use } from 'echarts/core';
import { BoxplotChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';

import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    BoxplotChart,
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

// Create highlighted cube scatter points
const highlightedSeries = computed(() => {
    if (props.highlighted.length === 0) return [];

    const cubeArray = Object.values(props.loadedCubes);
    const highlightedCubes = cubeArray.filter(cube => props.highlighted.includes(cube.id));

    const scatterData = [];

    highlightedCubes.forEach(cube => {
        xDimensions.forEach((dim, index) => {
            let value, cardCount;

            if (dim.key === 'A') {
                value = cube.stats.averageNonLandCmc;
                cardCount = cube.stats.totalCards - cube.stats.landCards;
            } else {
                const colorData = cube.stats.cmcByStrictColorIdentity[dim.key];
                if (colorData && colorData.count > 0) {
                    value = colorData.totalCmc / colorData.count;
                    cardCount = colorData.count;
                } else {
                    return; // Skip if no data for this color
                }
            }

            if (value !== undefined && value !== null) {
                scatterData.push({
                    value: [index, value],
                    cubeName: cube.name,
                    colorName: dim.name,
                    cardCount: cardCount,
                    avgCmc: value,
                });
            }
        });
    });

    return scatterData;
});

const chartOptions = computed(() => {
    const cubeArray = Object.values(props.loadedCubes);

    // Calculate box plot data for each dimension
    const boxplotData = xDimensions.map((dim, index) => {
        const values = cubeArray.map(cube => {
            if (dim.key === 'A') {
                return cube.stats.averageNonLandCmc;
            }
            return cube.stats.cmcByStrictColorIdentity[dim.key] ?
                (cube.stats.cmcByStrictColorIdentity[dim.key].totalCmc / cube.stats.cmcByStrictColorIdentity[dim.key].count) :
                0;
        });

        if (values.length === 0) return null;

        values.sort((a, b) => a - b);
        const min = values[0];
        const max = values[values.length - 1];
        const q1 = values[Math.floor(values.length * 0.25)];
        const median = values[Math.floor(values.length * 0.5)];
        const q3 = values[Math.floor(values.length * 0.75)];

        return [min, q1, median, q3, max];
    });

    const series = [
        {
            name: 'Distribution',
            type: 'boxplot',
            data: boxplotData.filter((d): d is number[] => d !== null).map((data, index) => [...data, index]),
            itemStyle: {
                borderColor: (params) => {
                    const color = xDimensions[params.dataIndex]?.color || '#5755d9';
                    return color;
                },
                borderWidth: 2,
            },
        },
    ];

    // Add highlighted points if any
    if (highlightedSeries.value.length > 0) {
        series.push({
            name: 'Highlighted Cubes',
            type: 'scatter',
            data: highlightedSeries.value,
            symbolSize: 8,
            itemStyle: {
                color: '#ffffff',
                borderColor: '#ff6b6b',
                borderWidth: 2,
                shadowBlur: 5,
                shadowColor: 'rgba(255, 107, 107, 0.5)',
            },
            z: 10,
        });
    }

    return {
        title: {
            text: 'Avg. Mana Value by Color',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                if (params.seriesName === 'Distribution') {
                    const [series, min, q1, median, q3, max] = params.data;
                    const colorName = xDimensions[params.dataIndex]?.name || 'Unknown';
                    return `<b>${colorName}</b><br/>
                            Max: ${max?.toFixed(2)}<br/>
                            Q3: ${q3?.toFixed(2)}<br/>
                            Median: ${median?.toFixed(2)}<br/>
                            Q1: ${q1?.toFixed(2)}<br/>
                            Min: ${min?.toFixed(2)}`;
                }
                if (params.seriesName === 'Highlighted Cubes') {
                    const data = params.data;
                    return `<b>${data.cubeName}</b><br/>${data.colorName}: ${data.avgCmc.toFixed(2)}<br/>Cards: ${data.cardCount}`;
                }
                return params.name;
            },
        },
        yAxis: {
            name: 'Avg. Mana Value',
            nameLocation: 'middle',
            type: 'value',
            nameGap: 35,
        },
        xAxis: {
            name: 'Color Category',
            nameLocation: 'middle',
            type: 'category',
            axisTick: {
                alignWithLabel: true,
            },
            axisLabel: {
                rotate: 30,
            },
            data: xDimensions.map(dim => dim.name),
            nameGap: 25,
        },
        series,
    };
});
</script>