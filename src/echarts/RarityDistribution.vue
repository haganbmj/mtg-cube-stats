<template>
    <VChart class="chart" :option="chartOptions" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';

import VChart from 'vue-echarts';
import { capitalizeFirstLetter } from '../util/HelperFunctions.mjs';

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    PieChart,
]);

const props = defineProps({
    rarityDistribution: {
        type: Object,
        required: true,
    }
});

const chartOptions = computed(() => {
    const data = Object.entries(props.rarityDistribution).map(([key, value]) => {
        return { name: capitalizeFirstLetter(key), value };
    });

    return {
        title: {
            text: 'Original Rarity',
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
                    formatter: '{b} ({d}%)',
                },
            }
        ],
    };
});
</script>
