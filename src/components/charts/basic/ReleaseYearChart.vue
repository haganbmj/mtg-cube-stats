<template>
    <VChart class="chart" :option="chartOptions" autoresize @mouseover="onChartMouseover" @mouseout="onChartMouseout" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent, MarkLineComponent, MarkAreaComponent } from 'echarts/components';

import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    MarkLineComponent,
    MarkAreaComponent,
    BarChart,
]);

const props = defineProps({
    releaseYearDistribution: {
        type: Object,
        required: true,
    },
    averageReleaseYear: {
        type: Number,
        default: 0,
    },
    averageReleaseYearStdDev: {
        type: Number,
        default: 0,
    },
    medianReleaseYear: {
        type: Number,
        default: 0,
    },
    medianReleaseYearMAD: {
        type: Number,
        default: 0,
    },
});

const hoveredStat = ref<'average' | 'median' | null>(null);

const onChartMouseover = (event: any) => {
    if (event.componentType === 'markLine') {
        hoveredStat.value = event.name === 'Average' ? 'average' : 'median';
    }
};

const onChartMouseout = (event: any) => {
    if (event.componentType === 'markLine') {
        hoveredStat.value = null;
    }
};

const releaseYears = [
    '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000',
    '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
    '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016',
    '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024',
    '2025', '2026',
]

const chartOptions = computed(() => {
    const totalCards = Object.values(props.releaseYearDistribution).reduce((a, b) => a + b, 0);
    const data = releaseYears.map(year => {
        return { name: year, value: (100 * (props.releaseYearDistribution[year] || 0) / totalCards).toFixed(2), rawValue: props.releaseYearDistribution[year] || 0 };
    });

    const hasStats = props.averageReleaseYear > 0;
    // releaseYears[0] = '1993' → index 0, so fractional index = year - 1993
    const avgIdx = props.averageReleaseYear - 1993;
    const medIdx = props.medianReleaseYear - 1993;
    const medLabel = props.medianReleaseYear % 1 === 0
        ? String(props.medianReleaseYear)
        : props.medianReleaseYear.toFixed(1);

    return {
        title: {
            text: 'Original Release Year',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (args) => {
                if (args.componentType === 'markLine') {
                    if (args.name === 'Average') {
                        return `<b>Average/Mean</b><br/>${props.averageReleaseYear.toFixed(1)}<br/>\u00b11\u03c3: ${props.averageReleaseYearStdDev.toFixed(2)} years`;
                    }
                    return `<b>Median</b><br/>${medLabel}<br/>\u00b11 MAD: ${props.medianReleaseYearMAD.toFixed(2)} years`;
                }
                return `<b>Year = ${args.name}</b><br/>${args.value}%<br/>${args.data.rawValue} Cards`;
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
                formatter: '{value} %',
            },
        },
        series: [
            {
                data,
                type: 'bar',
                markLine: hasStats ? {
                    silent: false,
                    symbol: ['none', 'none'],
                    data: [
                        {
                            name: 'Average',
                            xAxis: avgIdx,
                            lineStyle: { color: '#fac858', type: 'dashed', width: 2 },
                            label: {
                                formatter: `Avg: ${props.averageReleaseYear.toFixed(1)}`,
                                position: 'insideEndTop',
                                color: '#fac858',
                                fontSize: 11,
                            },
                        },
                        {
                            name: 'Median',
                            xAxis: medIdx,
                            lineStyle: { color: '#73c0de', type: 'solid', width: 2 },
                            label: {
                                formatter: `Med: ${medLabel}`,
                                position: 'insideEndBottom',
                                color: '#73c0de',
                                fontSize: 11,
                            },
                        },
                    ],
                } : undefined,
                markArea: hasStats ? {
                    silent: true,
                    data: [
                        ...hoveredStat.value === 'average' ? [[
                            {
                                // name: 'Mean \u00b1 \u03c3',
                                xAxis: avgIdx - props.averageReleaseYearStdDev,
                                itemStyle: { color: 'rgba(250, 200, 88, 0.2)' },
                            },
                            { xAxis: avgIdx + props.averageReleaseYearStdDev },
                        ]] : [],
                        ...hoveredStat.value === 'median' ? [[
                            {
                                // name: 'Median \u00b1 MAD',
                                xAxis: medIdx - props.medianReleaseYearMAD,
                                itemStyle: { color: 'rgba(115, 192, 222, 0.2)' },
                            },
                            { xAxis: medIdx + props.medianReleaseYearMAD },
                        ]] : [],
                    ],
                } : undefined,
            },
        ],
    };
});
</script>
