<template>
    <div class="survival-view">
        <EmptyState v-if="emptyReason !== null" :reason="emptyReason" />
        <template v-else>
            <p class="chart-description">Share of card copies still in a cube N weeks after being added (Kaplan–Meier). 'New' cards were eligible for less than 6 months when added.</p>
            <TrendChart :option="option" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FullTrendsData } from '../dataSource';
import { formatPercent, formatPercentTooltip, axisTooltip, daysToWeeks } from '../util/format';
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
    const toWeeks = (points: { t: number; s: number }[]) => points.map((p) => [daysToWeeks(p.t), p.s]);
    return {
        tooltip: { trigger: 'axis', formatter: axisTooltip((x) => `Week ${Math.round(x)}`, formatPercentTooltip) },
        legend: { data: ['Overall', 'New Cards', 'Established'] },
        xAxis: { type: 'value', name: 'Weeks since added', nameLocation: 'middle', nameGap: 28 },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatPercent(v) } },
        series: [
            { name: 'Overall', type: 'line', step: 'end', data: toWeeks(survival.overall) },
            { name: 'New Cards', type: 'line', step: 'end', data: toWeeks(survival.newCards) },
            { name: 'Established', type: 'line', step: 'end', data: toWeeks(survival.established) },
        ],
    };
});
</script>
