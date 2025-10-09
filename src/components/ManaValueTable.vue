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
    const totalCards = Object.values(props.cmcDistribution).reduce((a, b) => a + b, 0);
    const data = xAxisLabels.map(label => {
        return { name: label, value: (100 * (props.cmcDistribution[label] || 0) / totalCards).toFixed(2), rawValue: props.cmcDistribution[label] || 0 };
    });

    return {
        title: {
            text: 'Mana Values',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (args) => { return `<b>MV = ${args.name}</b><br/>${args.value}%<br/>${args.data.rawValue} Cards`},
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
            name: 'Percentage',
            nameLocation: 'middle',
            nameGap: 40,
            axisLabel: {
                formatter: '{value} %'
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
