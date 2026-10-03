<template>
    <div class="survival-view">
        <EmptyState v-if="emptyReason !== null" :reason="emptyReason" />
        <template v-else>
            <p class="chart-description">Share of card copies still in a cube N days after being added (Kaplan–Meier). 'New' cards were eligible for less than 6 months when added.</p>
            <TrendChart :option="option" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import TrendChart from '../components/TrendChart.vue';
import EmptyState from '../components/EmptyState.vue';

const props = defineProps<{
    data: FullTrendsData;
}>();

const emptyReason = computed(() => ('empty' in props.data.survival ? props.data.survival.reason : null));

const option = computed(() => {
    if ('empty' in props.data.survival) {
        return {};
    }
    const survival = props.data.survival;
    return {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Overall', 'New Cards', 'Established'] },
        xAxis: { type: 'value', name: 'Days' },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${v}%` } },
        series: [
            { name: 'Overall', type: 'line', step: 'end', data: survival.overall.map((p) => [p.t, p.s * 100]) },
            { name: 'New Cards', type: 'line', step: 'end', data: survival.newCards.map((p) => [p.t, p.s * 100]) },
            { name: 'Established', type: 'line', step: 'end', data: survival.established.map((p) => [p.t, p.s * 100]) },
        ],
    };
});
</script>
