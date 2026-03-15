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
    highlighted: {
        type: Array as () => string[],
        required: true,
    },
});

const chartOptions = computed(() => {
    const buckets = [
        { label: '≤180', max: 180 },
        { label: '≤360', min: 181, max: 360 },
        { label: '≤450', min: 361, max: 450 },
        { label: '≤540', min: 451, max: 540 },
        { label: '≤720', min: 541, max: 720 },
        { label: '>720', min: 721 },
    ];

    const cubeArray = Object.values(props.loadedCubes);
    const bucketCounts = buckets.map(bucket => {
        const cubesInBucket = cubeArray.filter(cube => {
            const cardCount = cube.stats.totalCards;
            if (bucket.min && bucket.max) {
                return cardCount >= bucket.min && cardCount <= bucket.max;
            } else if (bucket.max) {
                return cardCount <= bucket.max;
            } else if (bucket.min) {
                return cardCount >= bucket.min;
            }
            return false;
        });

        return {
            name: bucket.label,
            value: cubesInBucket.length,
            cubes: cubesInBucket.map(c => c.name)
        };
    });

    return {
        title: {
            text: 'Cube Size Distribution',
            left: 'center',
        },
        tooltip: {
            trigger: 'item',
            formatter: (args) => {
                const percentage = cubeArray.length > 0 ? (args.value / cubeArray.length * 100).toFixed(1) : 0;
                const cubeNames = args.data.cubes.slice(0, 5).join('<br/>') + (args.data.cubes.length > 5 ? '<br/>...' : '');
                return `<b>${args.name} cards</b><br/>${args.value} cubes (${percentage}%)<br/><br/>${cubeNames}`;
            },
        },
        xAxis: {
            type: 'category',
            data: buckets.map(b => b.label),
            name: 'Card Count',
            nameLocation: 'middle',
            nameGap: 25,
        },
        yAxis: {
            type: 'value',
            name: 'Number of Cubes',
            nameLocation: 'middle',
            nameGap: 40,
        },
        series: [
            {
                data: bucketCounts,
                type: 'bar',
            }
        ]
    };
});
</script>