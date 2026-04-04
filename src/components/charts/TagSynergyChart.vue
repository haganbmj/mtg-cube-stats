<template>
    <div class="tag-synergy-chart-container">
        <el-alert
            v-if="isLargeGraph"
            type="warning"
            :closable="false"
            title="Large graph"
            :description="`${nodeCount} nodes — rendering may be slow. Try increasing the minimum tag count.`"
            show-icon
            style="margin-bottom: 8px;"
        />
        <div v-if="isEmpty" class="empty-state">
            <el-empty description="No tag connections meet the current threshold" />
        </div>
        <VChart v-else class="chart" :option="chartOptions" autoresize />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { CubeCard } from '../../types/cube';

use([
    CanvasRenderer,
    TooltipComponent,
    LegendComponent,
    GraphChart,
]);

const props = defineProps({
    cards: {
        type: Array as () => CubeCard[],
        default: () => [],
    },
    minTagCount: {
        type: Number,
        default: 2,
    },
    cardSizes: {
        type: Object as () => Record<string, number>,
        default: () => ({}),
    },
});

const MAX_TAG_NODES = 80;
const LARGE_GRAPH_THRESHOLD = 500;

function formatTagLabel(tag: string): string {
    return tag.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getCardNodeColor(colorIdentity: string[] | undefined): string {
    if (!colorIdentity || colorIdentity.length === 0) return '#aaaaaa';
    if (colorIdentity.length > 1) return '#c8a900';
    switch (colorIdentity[0]) {
        case 'W': return '#f0ede0';
        case 'U': return '#0e68ab';
        case 'B': return '#4a4a4a';
        case 'R': return '#d3202a';
        case 'G': return '#00733e';
        default: return '#aaaaaa';
    }
}

const chartData = computed(() => {
    const cards = props.cards;

    // Build tag frequency map across all cards
    const tagCounts = new Map<string, number>();
    for (const card of cards) {
        for (const tag of (card.tags ?? [])) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
    }

    // Filter tags meeting the threshold, then cap at MAX_TAG_NODES by frequency
    const qualifyingTags = Array.from(tagCounts.entries())
        .filter(([, count]) => count >= props.minTagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TAG_NODES);

    if (qualifyingTags.length === 0) return null;

    const activeTagSet = new Set(qualifyingTags.map(([tag]) => tag));
    const maxTagCount = qualifyingTags[0][1];

    // Determine which cards connect to at least one active tag
    const connectedCardIds = new Set<string>();
    for (const card of cards) {
        if ((card.tags ?? []).some(t => activeTagSet.has(t))) {
            connectedCardIds.add(card.oracleId);
        }
    }

    if (connectedCardIds.size === 0) return null;

    // Build edges
    const edges: { source: string; target: string }[] = [];
    const seenOracleIds = new Set<string>();

    for (const card of cards) {
        if (!connectedCardIds.has(card.oracleId)) continue;
        if (seenOracleIds.has(card.oracleId)) continue;
        seenOracleIds.add(card.oracleId);

        for (const tag of (card.tags ?? [])) {
            if (activeTagSet.has(tag)) {
                edges.push({ source: card.oracleId, target: tag });
            }
        }
    }

    // Card nodes (deduplicated by oracleId)
    const cardNodes = Array.from(seenOracleIds).map(oracleId => {
        const card = cards.find(c => c.oracleId === oracleId)!;
        const size = props.cardSizes[oracleId] ?? 8;
        return {
            id: oracleId,
            name: card.name ?? oracleId,
            category: 0,
            symbolSize: size,
            symbol: 'circle',
            itemStyle: { color: getCardNodeColor(card.colorIdentity) },
            label: { show: false },
        };
    });

    // Tag nodes
    const tagNodes = qualifyingTags.map(([tag, count]) => {
        const size = 10 + Math.round((count / maxTagCount) * 20);
        return {
            id: tag,
            name: formatTagLabel(tag),
            category: 1,
            symbolSize: size,
            symbol: 'diamond',
            value: count,
            label: { show: size >= 22 },
        };
    });

    return { cardNodes, tagNodes, edges };
});

const isEmpty = computed(() => chartData.value === null);

const nodeCount = computed(() => {
    if (!chartData.value) return 0;
    return chartData.value.cardNodes.length + chartData.value.tagNodes.length;
});

const isLargeGraph = computed(() => nodeCount.value > LARGE_GRAPH_THRESHOLD);

const chartOptions = computed(() => {
    const data = chartData.value;
    if (!data) return {};

    const { cardNodes, tagNodes, edges } = data;
    const allNodes = [...cardNodes, ...tagNodes];

    return {
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                if (params.dataType === 'node') {
                    if (params.data.category === 0) {
                        return `<b>${params.data.name}</b>`;
                    }
                    const count = params.data.value;
                    return `<b>${params.data.name}</b><br/>${count} card${count !== 1 ? 's' : ''}`;
                }
                return '';
            },
        },
        legend: [{
            data: ['Cards', 'Tags'],
            textStyle: { color: '#ffffff' },
            top: 0,
        }],
        series: [{
            type: 'graph',
            layout: 'force',
            data: allNodes,
            links: edges,
            categories: [
                { name: 'Cards', itemStyle: { color: '#7289ab' } },
                { name: 'Tags', itemStyle: { color: '#d4a4eb' } },
            ],
            roam: true,
            label: {
                show: false,
                position: 'right',
                formatter: '{b}',
                fontSize: 11,
                color: '#ffffff',
            },
            force: {
                repulsion: 80,
                gravity: 0.08,
                edgeLength: [40, 120],
                layoutAnimation: true,
            },
            lineStyle: {
                opacity: 0.25,
                width: 1,
                curveness: 0,
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: { width: 2, opacity: 0.8 },
                label: { show: true },
            },
            scaleLimit: {
                min: 0.3,
                max: 6,
            },
        }],
    };
});
</script>

<style scoped>
.tag-synergy-chart-container {
    display: flex;
    flex-direction: column;
    height: 640px;
}

.chart {
    flex: 1;
    min-height: 0;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
}
</style>
