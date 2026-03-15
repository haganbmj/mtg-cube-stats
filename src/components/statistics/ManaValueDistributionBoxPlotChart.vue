<template>
    <VChart class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { BoxplotChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent, DatasetComponent } from 'echarts/components';

import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    DatasetComponent,
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

// Helper function to calculate box plot statistics
function calculateBoxPlotData(values: number[]) {
    if (values.length === 0) return [0, 0, 0, 0, 0];

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return [min, q1, median, q3, max];
}

const chartOptions = computed(() => {
    const cubeArray = Object.values(props.loadedCubes);
    const manaValues = ['L', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];

    // Calculate percentages for each cube and mana value
    const cubePercentages = cubeArray.map(cube => {
        const totalCards = cube.stats.totalCards;
        return manaValues.map(mv => {
            const count = cube.stats.cmcDistribution[mv] || 0;
            return totalCards > 0 ? (count / totalCards) * 100 : 0;
        });
    });

    // Calculate box plot data for each mana value
    const boxplotData = manaValues.map((mv, index) => {
        const values = cubePercentages.map(percentages => percentages[index]);
        return calculateBoxPlotData(values);
    });

    // Create highlighted cube scatter points
    const highlightedPoints = [];
    if (props.highlighted.length > 0) {
        cubeArray.forEach(cube => {
            if (props.highlighted.includes(cube.id)) {
                const totalCards = cube.stats.totalCards;
                manaValues.forEach((mv, index) => {
                    const count = cube.stats.cmcDistribution[mv] || 0;
                    const percentage = totalCards > 0 ? (count / totalCards) * 100 : 0;
                    if (count > 0) { // Only show points with actual cards
                        highlightedPoints.push({
                            value: [index, percentage],
                            cubeName: cube.name,
                            manaValue: mv,
                            cardCount: count,
                            percentage: percentage
                        });
                    }
                });
            }
        });
    }

    const series = [
        {
            name: 'Distribution',
            type: 'boxplot',
            data: boxplotData.map((data, index) => [...data, index]),
        }
    ];

    // Add highlighted points if any
    if (highlightedPoints.length > 0) {
        series.push({
            name: 'Highlighted Cubes',
            type: 'scatter',
            data: highlightedPoints,
            symbolSize: 8,
            itemStyle: {
                color: '#ffffff',
                borderColor: '#ff6b6b',
                borderWidth: 2,
                shadowBlur: 5,
                shadowColor: 'rgba(255, 107, 107, 0.5)'
            },
            z: 10,
        });
    }

    return {
        title: {
            text: 'Mana Value Distribution',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params: any) {
                if (params.componentType === 'series' && params.seriesType === 'boxplot') {
                    const [series, min, q1, median, q3, max] = params.data;
                    return `<b>MV ${manaValues[params.dataIndex]}</b><br/>
                            Max: ${max.toFixed(1)}%<br/>
                            Q3: ${q3.toFixed(1)}%<br/>
                            Median: ${median.toFixed(1)}%<br/>
                            Q1: ${q1.toFixed(1)}%<br/>
                            Min: ${min.toFixed(1)}%`;
                }
                if (params.seriesName === 'Highlighted Cubes') {
                    const data = params.data;
                    return `<b>${data.cubeName}</b><br/>MV ${data.manaValue}: ${data.percentage.toFixed(1)}%<br/>Cards: ${data.cardCount}`;
                }
                return params.name;
            },
        },
        xAxis: {
            type: 'category',
            data: manaValues,
            name: 'Mana Value',
            nameLocation: 'middle',
            nameGap: 25,
        },
        yAxis: {
            type: 'value',
            name: 'Percentage of Cards',
            nameLocation: 'middle',
            nameGap: 50,
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series
    };
});
</script>