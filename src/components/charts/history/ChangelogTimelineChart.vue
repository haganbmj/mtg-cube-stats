<template>
    <VChart class="changelog-timeline-chart" :option="chartOptions" autoresize @click="onClick" />
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { use } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, GridComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { CubeHistoryEntry } from '../../../util/CubeCobra';
import { WEEK_MS, weekStartOf } from '../../../util/CubeHistory';

use([
    CanvasRenderer,
    TooltipComponent,
    GridComponent,
    BarChart,
]);

const props = defineProps({
    entries: {
        type: Array as PropType<CubeHistoryEntry[]>,
        required: true,
    },
    start: {
        type: Number,
        required: true,
    },
    end: {
        type: Number,
        required: true,
    },
    selectedWeek: {
        type: Number as PropType<number | null>,
        default: null,
    },
});

const emit = defineEmits<{
    (e: 'select', weekStart: number): void
}>();

const weeks = computed(() => {
    const first = weekStartOf(props.start);
    const count = Math.max(1, Math.floor((weekStartOf(props.end) - first) / WEEK_MS) + 1);
    const counts = new Array<number>(count).fill(0);
    for (const entry of props.entries) {
        const idx = Math.floor((weekStartOf(entry.date) - first) / WEEK_MS);
        if (idx >= 0 && idx < count) counts[idx] += 1;
    }
    return counts.map((value, i) => ({ weekStart: first + i * WEEK_MS, value }));
});

const label = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const chartOptions = computed(() => ({
    grid: { left: 30, right: 10, top: 10, bottom: 30 },
    tooltip: {
        trigger: 'item',
        formatter: (args: any) => `<b>Week of ${args.name}</b><br/>${args.value} change${args.value === 1 ? '' : 's'}`,
    },
    xAxis: {
        type: 'category',
        data: weeks.value.map(w => label(w.weekStart)),
        axisLabel: { formatter: (v: string) => v.slice(0, 7) },
    },
    yAxis: {
        type: 'value',
        minInterval: 1,
    },
    series: [
        {
            type: 'bar',
            barCategoryGap: '10%',
            data: weeks.value.map(w => ({
                value: w.value,
                weekStart: w.weekStart,
                itemStyle: w.weekStart === props.selectedWeek
                    ? { color: '#ffffff', borderColor: '#ff6b6b', borderWidth: 2 }
                    : { color: '#5470c6' },
            })),
        },
    ],
}));

const onClick = (params: any) => {
    if (params?.data?.value > 0) emit('select', params.data.weekStart);
};
</script>

<style scoped>
.changelog-timeline-chart {
    height: 180px;
    width: 100%;
}
</style>
