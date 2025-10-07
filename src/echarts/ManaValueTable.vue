<template>
    <VChart class="chart" :option="chartOptions" />
</template>

<script setup>
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

const chartOptions = computed(() => {
    const data = Object.entries(props.cmcDistribution).map(([cmc, count]) => ({ name: cmc, value: count }));

    return {
        title: {
            text: 'Mana Values',
            subtext: 'Excludes lands',
            left: 'center'
        },
        tooltip: {
            trigger: 'item'
        },
        xAxis: {
            type: 'category',
            data: Object.keys(props.cmcDistribution),
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
                type: 'bar'
            }
        ]
    };
});
</script>
