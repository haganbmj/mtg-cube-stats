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

    // Get all unique years from all cubes, but limit to reasonable range
    const allYears = new Set();
    cubeArray.forEach(cube => {
        Object.keys(cube.stats.releaseYearDistribution || {}).forEach(year => {
            const yearNum = parseInt(year);
            if (yearNum >= 1993 && yearNum <= 2026) { // Reasonable MTG year range
                allYears.add(yearNum);
            }
        });
    });
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    // Calculate percentages for each cube and year
    const cubePercentages = cubeArray.map(cube => {
        const totalCards = cube.stats.totalCards;
        return sortedYears.map(year => {
            const count = cube.stats.releaseYearDistribution[year] || 0;
            return totalCards > 0 ? (count / totalCards) * 100 : 0;
        });
    });

    // Calculate box plot data for each year (only include years with data)
    const yearsWithData = [];
    const boxplotData = [];

    sortedYears.forEach((year, index) => {
        const values = cubePercentages.map(percentages => percentages[index]).filter(v => v > 0);
        if (values.length > 0) {
            yearsWithData.push(year);
            boxplotData.push(calculateBoxPlotData(cubePercentages.map(percentages => percentages[index])));
        }
    });

    // Create highlighted cube scatter points
    const highlightedPoints = [];
    if (props.highlighted.length > 0) {
        cubeArray.forEach(cube => {
            if (props.highlighted.includes(cube.id)) {
                const totalCards = cube.stats.totalCards;
                yearsWithData.forEach((year, index) => {
                    const count = cube.stats.releaseYearDistribution[year] || 0;
                    const percentage = totalCards > 0 ? (count / totalCards) * 100 : 0;
                    if (count > 0) { // Only show points with actual cards
                        highlightedPoints.push({
                            value: [index, percentage],
                            cubeName: cube.name,
                            year: year,
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
            text: 'Release Year Distribution',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params: any) {
                if (params.componentType === 'series' && params.seriesType === 'boxplot') {
                    const [series, min, q1, median, q3, max] = params.data;
                    return `<b>Year ${yearsWithData[params.dataIndex]}</b><br/>
                            Max: ${max.toFixed(1)}%<br/>
                            Q3: ${q3.toFixed(1)}%<br/>
                            Median: ${median.toFixed(1)}%<br/>
                            Q1: ${q1.toFixed(1)}%<br/>
                            Min: ${min.toFixed(1)}%`;
                }
                if (params.seriesName === 'Highlighted Cubes') {
                    const data = params.data;
                    return `<b>${data.cubeName}</b><br/>Year ${data.year}: ${data.percentage.toFixed(1)}%<br/>Cards: ${data.cardCount}`;
                }
                return params.name;
            },
        },
        xAxis: {
            type: 'category',
            data: yearsWithData,
            name: 'Release Year',
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
        // dataZoom: [
        //     {
        //         type: 'slider',
        //         show: true,
        //         xAxisIndex: [0],
        //         start: 0,
        //         end: 100
        //     }
        // ],
        series,
    };
});
</script>
