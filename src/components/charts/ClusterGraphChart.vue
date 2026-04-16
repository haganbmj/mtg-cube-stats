<template>
    <div class="cluster-graph-container">
        <el-form inline style="margin-bottom: 8px;">
            <el-form-item label="Min Cards per Cluster:">
                <el-input-number v-model="minCardCount" :min="1" :max="50" :step="1" controls-position="right" style="width: 120px;" />
            </el-form-item>
        </el-form>

        <div v-if="relevantClusters.length === 0" class="empty-state">
            <el-empty description="No clusters meet the current threshold" />
        </div>

        <template v-else>
            <div class="cluster-cards-grid">
                <div v-for="(cluster, index) in relevantClusters" :key="cluster.id" class="cluster-section">
                    <div class="cluster-header">
                        <span class="cluster-label">Cluster {{ index + 1 }}</span>
                        <el-tag size="small" type="info">{{ cluster.matchCount }} cards</el-tag>
                    </div>
                    <div class="cluster-body">
                        <!-- Color distribution donut -->
                        <el-tooltip :content="formatColorCounts(cluster.colorCounts)" placement="right" effect="dark">
                            <svg class="color-donut" viewBox="-1.1 -1.1 2.2 2.2">
                                <path
                                    v-for="(slice, i) in getPieSlices(cluster.colorCounts)"
                                    :key="i"
                                    :d="slice.d"
                                    :fill="slice.fill"
                                    stroke="#1c1c1c"
                                    stroke-width="0.025"
                                />
                            </svg>
                        </el-tooltip>
                        <!-- Card thumbnails -->
                        <div class="cluster-thumbnails">
                            <el-tooltip
                                v-for="card in cluster.topMatchingCards"
                                :key="card.oracleId"
                                effect="dark"
                                placement="top"
                                popper-class="card-image-tooltip"
                                :show-after="400"
                            >
                                <template #content>
                                    <div class="card-tooltip-content">
                                        <el-image
                                            :src="card.urlFront"
                                            fit="contain"
                                            :alt="card.name"
                                            class="card-tooltip-image"
                                        />
                                    </div>
                                </template>
                                <div class="card-thumb-wrap">
                                    <el-image
                                        :src="card.urlFront"
                                        fit="cover"
                                        :alt="card.name"
                                        class="card-thumb"
                                    />
                                </div>
                            </el-tooltip>
                            <el-text v-if="cluster.matchCount > cluster.topMatchingCards.length" type="info" size="small" class="more-cards">
                                +{{ cluster.matchCount - cluster.topMatchingCards.length }} more
                            </el-text>
                        </div><!-- end cluster-thumbnails -->
                    </div><!-- end cluster-body -->
                </div><!-- end cluster-section -->
            </div><!-- end cluster-cards-grid -->
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CubeCard } from '../../types/cube';
import { getArchetypeDefinitions, getCardClusterAssignments } from '../../util/MLArchetypeDetection';

const MAX_CARDS_PER_CLUSTER = 10;

const MTG_COLORS: Record<string, string> = {
    W: '#f0ede0',
    U: '#0e68ab',
    B: '#4a4a4a',
    R: '#d3202a',
    G: '#00733e',
    M: '#c8a900',
    C: '#aaaaaa',
};

const MTG_COLOR_NAMES: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    M: 'Multicolor',
    C: 'Colorless',
};

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'M', 'C'];

const props = defineProps({
    cards: {
        type: Array as () => CubeCard[],
        default: () => [],
    },
});

const minCardCount = ref(5);

function colorCategory(colorIdentity: string[] | undefined): string {
    if (!colorIdentity || colorIdentity.length === 0) return 'C';
    if (colorIdentity.length > 1) return 'M';
    return colorIdentity[0];
}

// SVG donut arc path: angles in radians, starting at 12 o'clock, clockwise.
const OUTER_R = 1;
const INNER_R = 0.48;

function donutArcD(startAngle: number, endAngle: number): string {
    const cos = Math.cos;
    const sin = Math.sin;
    const ox1 = OUTER_R * sin(startAngle);  const oy1 = -OUTER_R * cos(startAngle);
    const ox2 = OUTER_R * sin(endAngle);    const oy2 = -OUTER_R * cos(endAngle);
    const ix1 = INNER_R * sin(startAngle);  const iy1 = -INNER_R * cos(startAngle);
    const ix2 = INNER_R * sin(endAngle);    const iy2 = -INNER_R * cos(endAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M${ox1} ${oy1} A${OUTER_R} ${OUTER_R} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${INNER_R} ${INNER_R} 0 ${large} 0 ${ix1} ${iy1} Z`;
}

function getPieSlices(colorCounts: Record<string, number>): { d: string; fill: string }[] {
    const total = Object.values(colorCounts).reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    const entries = COLOR_ORDER.filter(c => colorCounts[c] > 0);
    const slices: { d: string; fill: string }[] = [];
    let startAngle = 0;

    for (const key of entries) {
        const fraction = colorCounts[key] / total;
        const angle = fraction * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const fill = MTG_COLORS[key];

        if (fraction >= 0.9999) {
            // Full ring — split into two halves to avoid degenerate arc
            slices.push({ fill, d: donutArcD(0, Math.PI) });
            slices.push({ fill, d: donutArcD(Math.PI, 2 * Math.PI) });
        } else {
            slices.push({ fill, d: donutArcD(startAngle, endAngle) });
        }

        startAngle = endAngle;
    }

    return slices;
}

function formatColorCounts(colorCounts: Record<string, number>): string {
    return COLOR_ORDER
        .filter(c => colorCounts[c] > 0)
        .map(c => `${MTG_COLOR_NAMES[c]}: ${colorCounts[c]}`)
        .join(', ');
}

interface MatchingCard {
    oracleId: string;
    name: string;
    urlFront: string;
    weight: number;
    colorIdentity: string[];
}

interface RelevantCluster {
    id: number;
    matchCount: number;
    colorCounts: Record<string, number>;
    allMatchingCards: MatchingCard[];
    topMatchingCards: MatchingCard[];
}

const relevantClusters = computed<RelevantCluster[]>(() => {
    const cubeCards = props.cards;
    if (cubeCards.length === 0) return [];

    const cubeCardMap = new Map<string, CubeCard>();
    for (const card of cubeCards) {
        if (!cubeCardMap.has(card.oracleId)) {
            cubeCardMap.set(card.oracleId, card);
        }
    }

    // Build cluster → matching cards by iterating each cube card's assignments.
    // This allows a card to appear in multiple clusters (primary + secondary).
    const clusterMatchMap = new Map<number, MatchingCard[]>();

    for (const [oracleId, cubeCard] of cubeCardMap) {
        const assignments = getCardClusterAssignments(oracleId);
        for (const assignment of assignments) {
            let list = clusterMatchMap.get(assignment.clusterId);
            if (!list) {
                list = [];
                clusterMatchMap.set(assignment.clusterId, list);
            }
            list.push({
                oracleId,
                name: cubeCard.name ?? oracleId,
                urlFront: cubeCard.urlFront ?? '',
                weight: assignment.weight,
                colorIdentity: cubeCard.colorIdentity ?? [],
            });
        }
    }

    const allClusters = getArchetypeDefinitions();
    const results: RelevantCluster[] = [];

    for (const cluster of allClusters) {
        const allMatching = clusterMatchMap.get(cluster.id);
        if (!allMatching || allMatching.length < minCardCount.value) continue;

        // Sort by weight descending (highest weight = closest to centroid first).
        allMatching.sort((a, b) => b.weight - a.weight);

        const colorCounts: Record<string, number> = {};
        for (const m of allMatching) {
            const cat = colorCategory(m.colorIdentity);
            colorCounts[cat] = (colorCounts[cat] || 0) + 1;
        }

        results.push({
            id: cluster.id,
            matchCount: allMatching.length,
            colorCounts,
            allMatchingCards: allMatching,
            topMatchingCards: allMatching.slice(0, MAX_CARDS_PER_CLUSTER),
        });
    }

    results.sort((a, b) => b.matchCount - a.matchCount);
    return results;
});
</script>


<style scoped>
.cluster-graph-container {
    display: flex;
    flex-direction: column;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
}

.cluster-cards-grid {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.cluster-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cluster-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cluster-label {
    font-weight: 600;
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.cluster-thumbnails {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.cluster-body {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.color-donut {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    cursor: help;
}

.card-thumb-wrap {
    width: 100px;
    height: 140px;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.15s;
}

.card-thumb-wrap:hover {
    transform: scale(1.05);
}

.card-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-tooltip-content {
    max-width: 300px;
}

.card-tooltip-image {
    width: 280px;
}

.more-cards {
    padding: 0 8px;
}
</style>
