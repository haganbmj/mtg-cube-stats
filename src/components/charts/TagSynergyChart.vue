<template>
    <div class="tag-synergy-chart-container">
        <el-form inline style="margin-bottom: 8px;">
            <el-form-item label="Minimum Tag Occurrences:">
                <el-input-number v-model="minTagCount" :min="1" :max="50" :step="1" controls-position="right" style="width: 120px;" />
            </el-form-item>
        </el-form>
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
        <el-table
            v-if="tagTableData.length > 0"
            :data="tagTableData"
            :default-sort="{ prop: 'zScore', order: 'descending' }"
            size="small"
            :max-height="320"
            style="margin-top: 8px;"
        >
            <el-table-column prop="name" label="Tag" min-width="140" sortable>
                <template #default="{ row }">
                    <span :style="{ opacity: row.inChart ? 1 : 0.5 }">{{ row.name }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="count" label="Cards" width="80" sortable align="right" />
            <el-table-column label="Cube Rate" width="100" sortable :sort-by="(row: any) => row.cubeRate" align="right">
                <template #default="{ row }">
                    {{ (row.cubeRate * 100).toFixed(1) }}%
                </template>
            </el-table-column>
            <el-table-column label="Global Rate" width="110" sortable :sort-by="(row: any) => row.globalRate" align="right">
                <template #default="{ row }">
                    {{ (row.globalRate * 100).toFixed(1) }}%
                </template>
            </el-table-column>
            <el-table-column prop="zScore" label="Global Dev" width="110" sortable align="right">
                <template #default="{ row }">
                    <template v-if="row.zScore !== 0">
                        <span :style="{ color: row.zScore > 1 ? '#67c23a' : row.zScore < -1 ? '#f56c6c' : '' }">
                            {{ row.zScore > 0 ? '+' : '' }}{{ row.zScore.toFixed(2) }}σ
                        </span>
                    </template>
                    <span v-else class="no-data">—</span>
                </template>
            </el-table-column>
            <el-table-column
                v-if="tagTableData.some(r => r.hasPeerData)"
                label="Peer Rate"
                width="100"
                sortable
                :sort-by="(row: any) => row.peerMeanRate ?? -Infinity"
                align="right"
            >
                <template #default="{ row }">
                    <template v-if="row.peerMeanRate !== null">
                        {{ (row.peerMeanRate * 100).toFixed(1) }}%
                    </template>
                    <span v-else class="no-data">—</span>
                </template>
            </el-table-column>
            <el-table-column
                v-if="tagTableData.some(r => r.hasPeerData)"
                label="Peer Dev"
                width="110"
                sortable
                :sort-by="(row: any) => row.peerZScore ?? -Infinity"
                align="right"
            >
                <template #default="{ row }">
                    <template v-if="row.peerZScore !== null">
                        <span :style="{ color: row.peerZScore > 1 ? '#67c23a' : row.peerZScore < -1 ? '#f56c6c' : '' }">
                            {{ row.peerZScore > 0 ? '+' : '' }}{{ row.peerZScore.toFixed(2) }}σ
                        </span>
                    </template>
                    <span v-else class="no-data">—</span>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { use } from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { CubeCard, Cube } from '../../types/cube';

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
    tagMeta: Record<string, [number, number, number, number, number]>;
}

const props = defineProps({
    cards: {
        type: Array as () => CubeCard[],
        default: () => [],
    },
    cardSizes: {
        type: Object as () => Record<string, number>,
        default: () => ({}),
    },
    peerCubes: {
        type: Object as () => Record<string, Cube>,
        default: () => ({}),
    },
});

const minTagCount = ref(2);

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

// Scored tag list — independent of minTagCount so the table always shows all tags.
const scoredTags = computed(() => {
    const cards = props.cards;
    const graph = tagGraphData.value;
    const peerCubeList = Object.values(props.peerCubes) as Cube[];

    const mapTag = (tag: string): string => graph?.tagFamilyMap[tag] ?? tag;

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

    const uniqueCardCount = new Set(cards.map(c => c.oracleId)).size;

    // Compute per-tag inclusion rates across peer cubes.
    let peerStats: Record<string, [number, number]> | null = null;
    if (peerCubeList.length >= 2) {
        const peerRateSum: Record<string, number> = {};
        const peerRateSumSq: Record<string, number> = {};
        const peerCount: Record<string, number> = {};

        for (const cube of peerCubeList) {
            const cubeTagCounts = new Map<string, number>();
            const seenIds = new Set<string>();
            for (const card of (cube.cards ?? [])) {
                if (seenIds.has(card.oracleId)) continue;
                seenIds.add(card.oracleId);
                const seenFamilies = new Set<string>();
                for (const rawTag of (card.tags ?? [])) {
                    const tag = mapTag(rawTag);
                    if (seenFamilies.has(tag)) continue;
                    seenFamilies.add(tag);
                    cubeTagCounts.set(tag, (cubeTagCounts.get(tag) ?? 0) + 1);
                }
            }
            const cubeUniqueCount = seenIds.size;
            if (cubeUniqueCount === 0) continue;
            for (const [tag, count] of cubeTagCounts) {
                const rate = count / cubeUniqueCount;
                peerRateSum[tag] = (peerRateSum[tag] ?? 0) + rate;
                peerRateSumSq[tag] = (peerRateSumSq[tag] ?? 0) + rate * rate;
                peerCount[tag] = (peerCount[tag] ?? 0) + 1;
            }
        }

        peerStats = {};
        for (const tag of Object.keys(peerRateSum)) {
            const n = peerCount[tag];
            const mean = peerRateSum[tag] / n;
            const variance = (peerRateSumSq[tag] / n) - (mean * mean);
            peerStats[tag] = [mean, Math.sqrt(Math.max(0, variance))];
        }
    }

    const all = Array.from(tagCounts.entries())
        .filter(([, count]) => count >= 1)
        .map(([tag, count]) => {
            const meta = graph?.tagMeta[tag];
            let zScore = 0;
            if (meta && uniqueCardCount > 0) {
                const cubeRate = count / uniqueCardCount;
                const meanRate = meta[3];
                const rateStdDev = meta[4];
                zScore = rateStdDev > 0 ? (cubeRate - meanRate) / rateStdDev : 0;
            }
            let peerZScore = 0;
            let peerMeanRate: number | null = null;
            const peer = peerStats?.[tag];
            if (peer && uniqueCardCount > 0) {
                const cubeRate = count / uniqueCardCount;
                peerMeanRate = peer[0];
                peerZScore = peer[1] > 0 ? (cubeRate - peer[0]) / peer[1] : 0;
            }
            return { tag, count, zScore, peerZScore, peerMeanRate, hasMeta: !!meta, hasPeer: !!peer };
        })
        .sort((a, b) => {
            if (graph) return b.zScore - a.zScore || b.count - a.count;
            return b.count - a.count;
        });

    return { all, uniqueCardCount, hasPeerData: peerStats !== null };
});

const chartData = computed(() => {
    const cards = props.cards;
    const graph = tagGraphData.value;
    const { all } = scoredTags.value;

    const mapTag = (tag: string): string => graph?.tagFamilyMap[tag] ?? tag;

    // Chart filters by minTagCount and caps at MAX_TAG_NODES.
    const chartTags = all
        .filter(qt => qt.count >= minTagCount.value)
        .slice(0, MAX_TAG_NODES);

    if (chartTags.length === 0) return null;

    const activeTagSet = new Set(chartTags.map(qt => qt.tag));
    const maxTagCount = Math.max(...chartTags.map(qt => qt.count));

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

    // Tag nodes — annotate with global metadata and z-score when available.
    const tagNodes = chartTags.map(({ tag, count, zScore }) => {
        const meta = graph?.tagMeta[tag];
        const size = 10 + Math.round((count / maxTagCount) * 20);
        return {
            id: tag,
            name: formatTagLabel(tag),
            category: 1,
            symbolSize: size,
            symbol: 'diamond',
            value: count,
            zScore: Math.round(zScore * 100) / 100,
            globalCubeCount: meta ? meta[0] : undefined,
            variance: meta ? meta[1] : undefined,
            label: { show: size >= 22 },
        };
    });

    return { cardNodes, tagNodes, edges, tagTagEdges };
});

const tagTableData = computed(() => {
    const graph = tagGraphData.value;
    if (!graph) return [];
    const { all, uniqueCardCount, hasPeerData } = scoredTags.value;
    const chartTagIds = chartData.value
        ? new Set(chartData.value.tagNodes.map(n => n.id))
        : new Set<string>();

    return all
        .filter(qt => qt.hasMeta)
        .map(({ tag, count, zScore, peerZScore, peerMeanRate, hasPeer }) => {
            const meta = graph.tagMeta[tag];
            const cubeRate = uniqueCardCount > 0 ? count / uniqueCardCount : 0;
            return {
                name: formatTagLabel(tag),
                tag,
                count,
                cubeRate,
                globalRate: meta[3],
                zScore: Math.round(zScore * 100) / 100,
                peerMeanRate: hasPeer ? peerMeanRate : null,
                peerZScore: hasPeer ? Math.round(peerZScore * 100) / 100 : null,
                inChart: chartTagIds.has(tag),
                hasPeerData,
            };
        });
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
                    if (params.data.zScore !== undefined && params.data.zScore !== 0) {
                        const sign = params.data.zScore > 0 ? '+' : '';
                        parts.push(`Deviation: ${sign}${params.data.zScore.toFixed(2)}σ`);
                    }
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

.no-data {
    color: #909399;
}
</style>
