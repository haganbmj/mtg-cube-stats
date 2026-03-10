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
    },
    minimumRarityDistribution: {
        type: Object,
        required: true,
    },
});

const chartOptions = computed(() => {
    const data = Object.entries(props.rarityDistribution).map(([key, value]) => {
        return { name: capitalizeFirstLetter(key), value };
    }).sort((a, b) => {
        const order = ['common', 'uncommon', 'rare', 'mythic'];
        return order.indexOf(a.name.toLowerCase()) - order.indexOf(b.name.toLowerCase());
    });

    const minData = Object.entries(props.minimumRarityDistribution).map(([key, value]) => {
        return { name: capitalizeFirstLetter(key), value };
    }).sort((a, b) => {
        const order = ['common', 'uncommon', 'rare', 'mythic'];
        return order.indexOf(a.name.toLowerCase()) - order.indexOf(b.name.toLowerCase());
    });

    return {
        title: {
            text: 'Minimum/Original Rarity',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: '<b>{a}</b><br/>{b}<br/>{c} Cards ({d}%)',
        },
        series: [
            {
                data: data,
                name: 'Original Rarity',
                type: 'pie',
                radius: ['0%', '40%'],
                label: {
                    show: false,
                },
            },
            {
                data: minData,
                name: 'Minimum Rarity',
                type: 'pie',
                radius: ['42%', '50%'],
                label: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    formatter: '{b} ({d}%)',
                },
            },
        ],
    };
});
</script>
