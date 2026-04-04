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
import { computed, ref, onMounted } from 'vue';
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

interface TagGraphData {
    totalCubes: number;
    tagFamilyMap: Record<string, string>;
    tagPairs: [string, string, number, number][];
    tagMeta: Record<string, [number, number, number]>;
}

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
const TAG_TAG_PMI_THRESHOLD = 0.2;

const tagGraphData = ref<TagGraphData | null>(null);

onMounted(async () => {
    try {
        const module = await import('../../../data/cubecobra-tag-graph.json') as unknown as { default: TagGraphData };
        tagGraphData.value = module.default;
    } catch {
        // Precomputed tag graph not available — chart works without it.
    }
});

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
    const graph = tagGraphData.value;

    // Map raw tag → family representative (deduplicates synonyms like tribal → typal).
    const mapTag = (tag: string): string => graph?.tagFamilyMap[tag] ?? tag;

    // Build tag frequency map using family-mapped tags.
    // Use a Set per card to avoid double-counting when multiple synonyms map to the same rep.
    const tagCounts = new Map<string, number>();
    for (const card of cards) {
        const seen = new Set<string>();
        for (const rawTag of (card.tags ?? [])) {
            const tag = mapTag(rawTag);
            if (seen.has(tag)) continue;
            seen.add(tag);
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
    }

    // Filter tags meeting the threshold, then cap at MAX_TAG_NODES by frequency.
    const qualifyingTags = Array.from(tagCounts.entries())
        .filter(([, count]) => count >= props.minTagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TAG_NODES);

    if (qualifyingTags.length === 0) return null;

    const activeTagSet = new Set(qualifyingTags.map(([tag]) => tag));
    const maxTagCount = qualifyingTags[0][1];

    // Determine which cards connect to at least one active tag.
    const connectedCardIds = new Set<string>();
    for (const card of cards) {
        for (const rawTag of (card.tags ?? [])) {
            if (activeTagSet.has(mapTag(rawTag))) {
                connectedCardIds.add(card.oracleId);
                break;
            }
        }
    }

    if (connectedCardIds.size === 0) return null;

    // Build card → tag edges (using mapped tags, deduplicated per card).
    type LinkData = { source: string; target: string; lineStyle?: Record<string, any>; pmi?: number };
    const edges: LinkData[] = [];
    const seenOracleIds = new Set<string>();

    for (const card of cards) {
        if (!connectedCardIds.has(card.oracleId)) continue;
        if (seenOracleIds.has(card.oracleId)) continue;
        seenOracleIds.add(card.oracleId);

        const seenTags = new Set<string>();
        for (const rawTag of (card.tags ?? [])) {
            const tag = mapTag(rawTag);
            if (activeTagSet.has(tag) && !seenTags.has(tag)) {
                seenTags.add(tag);
                edges.push({ source: card.oracleId, target: tag });
            }
        }
    }

    // Build tag → tag edges from precomputed PMI data.
    // Only add edges between tags that are both active in this cube.
    const tagTagEdges: LinkData[] = [];
    if (graph) {
        // Build a quick lookup for active pairs.
        const pairLookup = new Map<string, number>();
        for (const [a, b, pmi] of graph.tagPairs) {
            if (pmi < TAG_TAG_PMI_THRESHOLD) continue;
            pairLookup.set(`${a}|${b}`, pmi);
            pairLookup.set(`${b}|${a}`, pmi);
        }

        const activeList = Array.from(activeTagSet);
        for (let i = 0; i < activeList.length; i++) {
            for (let j = i + 1; j < activeList.length; j++) {
                const pmi = pairLookup.get(`${activeList[i]}|${activeList[j]}`);
                if (pmi !== undefined) {
                    const width = 1 + Math.min(pmi * 3, 4);
                    tagTagEdges.push({
                        source: activeList[i],
                        target: activeList[j],
                        pmi,
                        lineStyle: {
                            width,
                            type: 'dashed',
                            color: '#a070d0',
                            opacity: 0.3 + Math.min(pmi * 0.5, 0.5),
                            curveness: 0.2,
                        },
                    });
                }
            }
        }
    }

    // Card nodes (deduplicated by oracleId).
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

    // Tag nodes — annotate with global metadata when available.
    const tagNodes = qualifyingTags.map(([tag, count]) => {
        const meta = graph?.tagMeta[tag];
        const size = 10 + Math.round((count / maxTagCount) * 20);
        return {
            id: tag,
            name: formatTagLabel(tag),
            category: 1,
            symbolSize: size,
            symbol: 'diamond',
            value: count,
            globalCubeCount: meta ? meta[0] : undefined,
            variance: meta ? meta[1] : undefined,
            label: { show: size >= 22 },
        };
    });

    return { cardNodes, tagNodes, edges, tagTagEdges };
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

    const { cardNodes, tagNodes, edges, tagTagEdges } = data;
    const allNodes = [...cardNodes, ...tagNodes];
    const allEdges = [...edges, ...tagTagEdges];
    const hasTagCorrelations = tagTagEdges.length > 0;

    return {
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                if (params.dataType === 'node') {
                    if (params.data.category === 0) {
                        return `<b>${params.data.name}</b>`;
                    }
                    const count = params.data.value;
                    const parts = [`<b>${params.data.name}</b>`, `${count} card${count !== 1 ? 's' : ''}`];
                    if (params.data.globalCubeCount) {
                        const pct = ((params.data.globalCubeCount / (tagGraphData.value?.totalCubes ?? 1)) * 100).toFixed(1);
                        parts.push(`${pct}% of cubes globally`);
                    }
                    return parts.join('<br/>');
                }
                if (params.dataType === 'edge' && params.data.pmi !== undefined) {
                    return `<b>${formatTagLabel(params.data.source)} ↔ ${formatTagLabel(params.data.target)}</b><br/>PMI: ${params.data.pmi.toFixed(3)}`;
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
            links: allEdges,
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
                repulsion: hasTagCorrelations ? 100 : 80,
                gravity: 0.08,
                edgeLength: hasTagCorrelations ? [30, 140] : [40, 120],
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
