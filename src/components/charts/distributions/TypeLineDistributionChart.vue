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

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    PieChart,
]);

const PRIMARY_TYPE_ORDER = ['Land', 'Creature', 'Artifact', 'Enchantment', 'Instant', 'Sorcery'];

const props = defineProps({
    primaryTypeDistribution: {
        type: Object,
        required: true,
    },
});

const chartOptions = computed(() => {
    const data = Object.entries(props.primaryTypeDistribution).map(([key, value]) => {
        return { name: key, value };
    }).sort((a, b) => {
        const ai = PRIMARY_TYPE_ORDER.indexOf(a.name);
        const bi = PRIMARY_TYPE_ORDER.indexOf(b.name);
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    return {
        title: {
            text: 'Primary Card Types',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}<br/>{c} Cards ({d}%)',
        },
        series: [
            {
                data,
                name: 'Primary Type',
                type: 'pie',
                label: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    formatter: '{b} ({d}%)',
                },
            },
        ],
    };
});
</script>
