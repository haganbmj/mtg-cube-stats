<template>
    <div class="cluster-graph-container">
        <el-form inline style="margin-bottom: 8px; align-items: center;">
            <el-form-item label="Min Cards per Cluster:">
                <el-input-number v-model="minCardCount" :min="1" :max="50" :step="1" controls-position="right" style="width: 120px;" />
            </el-form-item>
            <el-form-item label="Max Cluster Overlap:">
                <el-tooltip content="Hide clusters whose card sets are too similar to a higher-ranked cluster. Lower values deduplicate more aggressively." placement="top" effect="dark">
                    <el-input-number v-model="maxJaccard" :min="0.1" :max="1.0" :step="0.05" :precision="2" controls-position="right" style="width: 120px;" />
                </el-tooltip>
            </el-form-item>
            <el-form-item>
                <span class="cluster-count-label">{{ relevantClusters.length }} cluster{{ relevantClusters.length === 1 ? '' : 's' }} match</span>
            </el-form-item>
        </el-form>

        <div v-if="relevantClusters.length === 0" class="empty-state">
            <el-empty description="No clusters meet the current threshold" />
        </div>

        <template v-else>
            <div class="cluster-cards-grid">
                <div v-for="(cluster, index) in displayedClusters" :key="cluster.id" class="cluster-section">
                    <div class="cluster-header">
                        <span class="cluster-label">Cluster {{ index + 1 }}</span>
                        <el-tooltip content="Cards in this cube that belong to this cluster / total cards in the cluster globally" placement="top" effect="dark">
                            <el-tag size="small" type="info">{{ cluster.matchCount }} / {{ cluster.memberCount }} cards</el-tag>
                        </el-tooltip>
                        <el-tooltip content="Composite relevance score — higher means this cluster is more distinctively represented in this cube relative to its global frequency, category expectations, and internal concentration" placement="top" effect="dark">
                            <span class="cluster-stat">&#963; {{ cluster.significance.toPrecision(3) }}</span>
                        </el-tooltip>
                        <el-tooltip content="Average effective card weight — how exclusively the matched cards belong to this cluster within this cube (0–5 scale, higher = more distinctive)" placement="top" effect="dark">
                            <span class="cluster-stat">&#773;w {{ cluster.avgWeight.toFixed(2) }}</span>
                        </el-tooltip>
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
                        <!-- Card thumbnails + show more -->
                        <div class="cluster-content">
                            <div class="cluster-thumbnails">
                                <el-tooltip
                                    v-for="card in visibleCards(cluster)"
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
                            </div><!-- end cluster-thumbnails -->
                            <div v-if="shownCards(cluster) < cluster.matchCount || shownCards(cluster) > INITIAL_CARDS" class="show-more-row">
                                <el-button
                                    v-if="shownCards(cluster) < cluster.matchCount"
                                    plain
                                    size="small"
                                    style="flex: 1;"
                                    @click="expandCluster(cluster.id)"
                                >
                                    Show {{ Math.min(PAGE_SIZE, cluster.matchCount - shownCards(cluster)) }} more
                                    ({{ cluster.matchCount - shownCards(cluster) }} remaining)
                                </el-button>
                                <el-button
                                    v-if="shownCards(cluster) > INITIAL_CARDS"
                                    plain
                                    size="small"
                                    style="flex: 1;"
                                    @click="collapseCluster(cluster.id)"
                                >
                                    Show less
                                </el-button>
                            </div>
                        </div><!-- end cluster-content -->
                    </div><!-- end cluster-body -->
                </div><!-- end cluster-section -->
            </div><!-- end cluster-cards-grid -->
            <div v-if="relevantClusters.length > INITIAL_CLUSTERS" class="show-more-clusters-row">
                <el-button
                    v-if="!showAllClusters"
                    plain
                    @click="showAllClusters = true"
                >
                    Show {{ relevantClusters.length - INITIAL_CLUSTERS }} more clusters
                </el-button>
                <el-button
                    v-else
                    plain
                    @click="showAllClusters = false"
                >
                    Show fewer clusters
                </el-button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CubeCard } from '../../types/cube';
import type { CubeCategoryDefinition } from '../../util/CubeCategoryDetection';
import type { TagCategoryDefinition } from '../../util/CubeTagCategoryDetection';
import { getTagToIdx } from '../../util/CubeTagCategoryDetection';
import { getArchetypeDefinitions, getCardClusterAssignments } from '../../util/MLArchetypeDetection';

const INITIAL_CARDS = 8;
const PAGE_SIZE = 8;
const INITIAL_CLUSTERS = 10;

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
    category: {
        type: Object as () => CubeCategoryDefinition | null,
        default: null,
    },
    tagCategory: {
        type: Object as () => TagCategoryDefinition | null,
        default: null,
    },
});

const minCardCount = ref(10);
const showAllClusters = ref(false);
const maxJaccard = ref(0.5);

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
    memberCount: number;
    significance: number;
    avgWeight: number;
    colorCounts: Record<string, number>;
    allMatchingCards: MatchingCard[];
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

    // Cube-local cluster spread per card: how many matched clusters does this card appear in
    // within THIS cube? A card exclusive to one cube cluster is more "vital" to it than one
    // that drifts across five clusters (even if it's globally distinctive).
    const cardCubeClusterCount = new Map<string, number>();
    for (const matches of clusterMatchMap.values()) {
        for (const m of matches) {
            cardCubeClusterCount.set(m.oracleId, (cardCubeClusterCount.get(m.oracleId) ?? 0) + 1);
        }
    }

    // Cube-internal totals: used to measure how concentrated the cube is in each cluster
    // relative to its own spread. Computed across ALL cluster matches (pre-filter) so
    // the denominator reflects the full archetype signal, not just the visible clusters.
    const totalCubeMatches = Array.from(clusterMatchMap.values())
        .reduce((sum, matches) => sum + matches.length, 0);
    const numActiveClusters = Math.max(clusterMatchMap.size, 1);
    const avgCubeMatchesPerCluster = totalCubeMatches / numActiveClusters;

    const allClusters = getArchetypeDefinitions();
    const results: RelevantCluster[] = [];

    for (const cluster of allClusters) {
        const allMatching = clusterMatchMap.get(cluster.id);
        if (!allMatching || allMatching.length < minCardCount.value) continue;

        // Sort by weight descending (highest distinctiveness first).
        // Use cube-local effective weight: global distinctiveness ÷ how many cube clusters
        // the card appears in. Cards vital specifically to this cluster rank above generic
        // inclusions that drift across multiple cube archetypes.
        const effectiveWeight = (card: MatchingCard) =>
            card.weight / Math.max(cardCubeClusterCount.get(card.oracleId) ?? 1, 1);

        allMatching.sort((a, b) => effectiveWeight(b) - effectiveWeight(a));

        const colorCounts: Record<string, number> = {};
        for (const m of allMatching) {
            const cat = colorCategory(m.colorIdentity);
            colorCounts[cat] = (colorCounts[cat] || 0) + 1;
        }

        // avgWeight uses cube-local effective weight so significance also rewards clusters
        // where the matched cards are specifically vital to this cube (not generic filler).
        const avgWeight = allMatching.reduce((s, m) => s + effectiveWeight(m), 0) / allMatching.length;

        // Category-relative ratio: how much more of this cluster does the cube have
        // compared to what its cube category typically expects?
        // Clusters that are routine for this cube type are penalized; unusual ones are boosted.
        let categoryRatio = 1.0;
        if (props.category?.centroid) {
            const actualFraction = allMatching.length / Math.max(cubeCards.length, 1);
            // Use a small epsilon floor so zero-expectation clusters don't get infinite ratios.
            const expectedFraction = Math.max(props.category.centroid[cluster.id] ?? 0, 0.002);
            categoryRatio = Math.min(actualFraction / expectedFraction, 5.0);
        }

        // Tag-category ratio: compare the tag composition of this cluster's matched cards
        // against what cubes in this tag category typically look like. Clusters whose matched
        // cards carry tags that are over-represented for this cube type are boosted; clusters
        // populated with universally common tags (removal, draw) that don't distinguish this
        // cube type from others are penalized. Uses human-curated Scryfall Tagger data.
        let tagCategoryRatio = 1.0;
        const tagToIdx = getTagToIdx();
        if (props.tagCategory?.centroid && tagToIdx) {
            const tagCounts = new Map<number, number>();
            let totalTagPairs = 0;
            for (const card of allMatching) {
                const cubeCard = cubeCardMap.get(card.oracleId);
                if (!cubeCard?.tags) continue;
                for (const tag of cubeCard.tags) {
                    const idx = tagToIdx.get(tag);
                    if (idx !== undefined) {
                        tagCounts.set(idx, (tagCounts.get(idx) ?? 0) + 1);
                        totalTagPairs++;
                    }
                }
            }
            if (totalTagPairs > 0) {
                let ratioSum = 0;
                let ratioCount = 0;
                for (const [idx, count] of tagCounts) {
                    const actualFraction = count / totalTagPairs;
                    const expectedFraction = Math.max(props.tagCategory.centroid[idx] ?? 0, 0.001);
                    ratioSum += Math.min(actualFraction / expectedFraction, 5.0);
                    ratioCount++;
                }
                tagCategoryRatio = ratioCount > 0 ? ratioSum / ratioCount : 1.0;
            }
        }

        // Significance: coverage (matchCount/memberCount) × distinctiveness × category surprise
        //             × tag-category surprise × internal concentration.
        const internalConcentration = allMatching.length / Math.max(avgCubeMatchesPerCluster, 1);
        const significance = (allMatching.length / (cluster.memberCount || 1)) * avgWeight * categoryRatio * tagCategoryRatio * internalConcentration;

        results.push({
            id: cluster.id,
            matchCount: allMatching.length,
            memberCount: cluster.memberCount,
            significance,
            avgWeight,
            colorCounts,
            allMatchingCards: allMatching,
        });
    }

    results.sort((a, b) => b.significance - a.significance);

    // Greedy Jaccard deduplication: iterate clusters in significance order, discard any
    // cluster whose matched card set overlaps too heavily with a higher-ranked kept cluster.
    // J(A,B) = |A∩B| / |A∪B|. Two clusters that describe the same cube cards are redundant;
    // the more significant one already captures that archetype signal.
    const kept: RelevantCluster[] = [];
    const keptSets: Set<string>[] = [];

    for (const cluster of results) {
        const cardSet = new Set(cluster.allMatchingCards.map(c => c.oracleId));
        let dominated = false;
        for (const keptSet of keptSets) {
            let intersection = 0;
            for (const id of cardSet) {
                if (keptSet.has(id)) intersection++;
            }
            const union = cardSet.size + keptSet.size - intersection;
            if (union > 0 && intersection / union >= maxJaccard.value) {
                dominated = true;
                break;
            }
        }
        if (!dominated) {
            kept.push(cluster);
            keptSets.push(cardSet);
        }
    }

    return kept;
});

const displayedClusters = computed(() =>
    showAllClusters.value ? relevantClusters.value : relevantClusters.value.slice(0, INITIAL_CLUSTERS),
);

// Per-cluster expanded card count (keyed by cluster.id).
const expandedCounts = ref<Record<number, number>>({});

function shownCards(cluster: { id: number }): number {
    return expandedCounts.value[cluster.id] ?? INITIAL_CARDS;
}

function visibleCards(cluster: { id: number; allMatchingCards: { oracleId: string; name: string; urlFront: string; weight: number; colorIdentity: string[] }[] }) {
    return cluster.allMatchingCards.slice(0, shownCards(cluster));
}

function expandCluster(clusterId: number) {
    const current = expandedCounts.value[clusterId] ?? INITIAL_CARDS;
    expandedCounts.value = { ...expandedCounts.value, [clusterId]: current + PAGE_SIZE };
}

function collapseCluster(clusterId: number) {
    expandedCounts.value = { ...expandedCounts.value, [clusterId]: INITIAL_CARDS };
}
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

.cluster-body {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.cluster-content {
    container-type: inline-size;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cluster-thumbnails {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
}

@container (min-width: 900px) {
    .cluster-thumbnails {
        grid-template-columns: repeat(8, 1fr);
    }
}

.color-donut {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    cursor: help;
}

.card-thumb-wrap {
    width: 100%;
    aspect-ratio: 63 / 88;
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

.show-more-row {
    display: flex;
    gap: 6px;
    width: 100%;
}

.show-more-clusters-row {
    display: flex;
    justify-content: center;
    padding: 8px 0;
}

.cluster-count-label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.cluster-stat {
    font-size: 11px;
    font-family: monospace;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    padding: 1px 5px;
    cursor: default;
    white-space: nowrap;
}
</style>
