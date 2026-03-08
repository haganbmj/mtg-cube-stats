<template>
    <VChart class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';

import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    BarChart,
]);

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const chartOptions = computed(() => {
    const cubeArray = Object.values(props.loadedCubes);

    // Aggregate all cards across all cubes
    const combined = {};
    cubeArray.forEach(cube => {
        if (cube.stats?.releaseYearDistribution) {
            Object.entries(cube.stats.releaseYearDistribution).forEach(([year, count]) => {
                combined[year] = (combined[year] || 0) + count;
            });
        }
    });

    const releaseYears = [
        '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000',
        '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
        '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016',
        '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024',
        '2025', '2026',
    ];

    const totalCards = Object.values(combined).reduce((a, b) => a + b, 0);
    const data = releaseYears.map(year => {
        return {
            name: year,
            value: (100 * (combined[year] || 0) / totalCards).toFixed(2),
            rawValue: combined[year] || 0
        };
    });

    return {
        title: {
            text: 'Release Year Distribution (All Cards)',
            subtext: 'Aggregated across all loaded cubes',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (args) => {
                return `<b>Year ${args.name}</b><br/>${args.value}%<br/>${args.data.rawValue} cards`;
            },
        },
        xAxis: {
            type: 'category',
            data: releaseYears,
            name: 'Release Year',
            nameLocation: 'middle',
            nameGap: 25,
        },
        yAxis: {
            type: 'value',
            name: 'Percentage',
            nameLocation: 'middle',
            nameGap: 40,
            axisLabel: {
                formatter: '{value}%'
            },
        },
        series: [
            {
                data,
                type: 'bar',
            }
        ]
    };
});
</script>
