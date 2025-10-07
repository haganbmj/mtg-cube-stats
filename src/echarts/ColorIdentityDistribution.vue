<template>
    <VChart class="chart" :option="chartOptions" />
</template>

<script setup>
import { computed } from 'vue';
import { use } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';

import VChart from 'vue-echarts';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    PieChart,
]);

const props = defineProps({
    colorDistribution: {
        type: Object,
        required: true,
    }
});

const dataLabels = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless',
};

const chartOptions = computed(() => {
    const data = Object.entries(props.colorDistribution).map(([key, value]) => {
        return { name: dataLabels[key] || key, value };
    });

    return {
        title: {
            text: 'Color Identity',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}<br/>{c} Cards ({d}%)',
        },
        series: [
            {
                data,
                type: 'pie',
                label: {
                    color: 'rgba(255, 255, 255, 0.3)',
                },
                color: ['#f8f4e3', '#d0e3f2', '#b8c2c6', '#f2b5a0', '#b4e2b0', '#cfcfcf'],
            }
        ],
    };
});
</script>
