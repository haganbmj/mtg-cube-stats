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
    cmcDistribution: {
        type: Object,
        required: true,
    }
});

const xAxisLabels = ['L','0','1','2','3','4','5','6','7','8','9','10+'];

const chartOptions = computed(() => {
    const data = xAxisLabels.map(label => {
        return { name: label, value: props.cmcDistribution[label] || 0 };
    });

    return {
        title: {
            text: 'Mana Values',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: '<b>{b}</b><br/>{c} Cards',
        },
        xAxis: {
            type: 'category',
            // Can't rely on keys because javascript is stupid with property ordering of numerics.
            // data: Object.keys(props.cmcDistribution),
            data: xAxisLabels,
            name: 'Mana Value',
            nameLocation: 'middle',
            nameGap: 25,
        },
        yAxis: {
            type: 'value',
            name: 'Count',
            nameLocation: 'middle',
            nameGap: 40,
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
