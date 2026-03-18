<template>
    <div class="infographic">
        <el-row :gutter="20" class="stats-cards">
            <!-- Basic Stats -->
            <el-col :span="6" :xs="12" :sm="8" :md="6">
                <el-card class="stat-card">
                    <div class="stat-number">{{ totalCubes.toLocaleString() }}</div>
                    <div class="stat-label">Total Cubes</div>
                </el-card>
            </el-col>

            <el-col :span="6" :xs="12" :sm="8" :md="6">
                <el-card class="stat-card">
                    <div class="stat-number">{{ totalCards.toLocaleString() }}</div>
                    <div class="stat-label">Total Cards</div>
                </el-card>
            </el-col>

            <el-col :span="6" :xs="12" :sm="8" :md="6">
                <el-card class="stat-card">
                    <div class="stat-number">{{ totalUniqueCards.toLocaleString() }}</div>
                    <div class="stat-label">Unique Cards</div>
                </el-card>
            </el-col>

            <el-col :span="6" :xs="12" :sm="8" :md="6">
                <el-card class="stat-card">
                    <div class="stat-number">{{ uniqueOnlyCards.toLocaleString() }}</div>
                    <div class="stat-label">Cards in Only 1 Cube</div>
                </el-card>
            </el-col>

            <!-- <el-col :span="6" :xs="12" :sm="8" :md="6">
                <el-card class="stat-card">
                    <div class="stat-number">{{ averageCardsPerCube.toFixed(0) }}</div>
                    <div class="stat-label">Avg Cards per Cube</div>
                </el-card>
            </el-col> -->
        </el-row>

        <el-row :gutter="20" class="content-sections">
            <!-- Top 10 Popular Cards -->
            <el-col :span="12" :xs="24">
                <el-card class="content-card">
                    <template #header>
                        <h3>Most Popular Non-Land Cards</h3>
                        <p class="subtitle">By number of cubes containing them</p>
                    </template>
                    <div class="card-list two-column">
                        <div v-for="(card, index) in topPopularCards" :key="card.oracleId" class="card-item">
                            <div class="card-rank">{{ index + 1 }}</div>
                            <el-tooltip
                                placement="right"
                                :show-after="500"
                                popper-class="card-tooltip"
                                :hide-after="0"
                            >
                                <template #content>
                                    <img :src="card.urlFront" class="card-image" loading="lazy" />
                                </template>
                                <img :src="card.urlFront" class="card-image list-image" loading="lazy" />
                            </el-tooltip>
                            <div class="card-info">
                                <div class="card-name">{{ card.name }}</div>
                                <div class="card-stats">{{ card.cubeCount }} cubes ({{ ((card.cubeCount / totalCubes) * 100).toFixed(1) }}%)</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <!-- Top 10 Lowest Elo Cards -->
            <el-col :span="12" :xs="24">
                <el-card class="content-card">
                    <template #header>
                        <h3>Lowest Elo Cards</h3>
                        <p class="subtitle">By CubeCobra Elo rating</p>
                    </template>
                    <div class="card-list two-column">
                        <div v-for="(card, index) in topLowEloCards" :key="card.oracleId" class="card-item">
                            <div class="card-rank">{{ index + 1 }}</div>
                            <el-tooltip
                                placement="right"
                                :show-after="500"
                                popper-class="card-tooltip"
                                :hide-after="0"
                            >
                                <template #content>
                                    <img :src="card.urlFront" class="card-image" loading="lazy" />
                                    <!-- <div class="cube-list">
                                        <strong>Found in cubes:</strong>
                                        <div v-for="cube in card.containingCubes" :key="cube.id" class="cube-name">
                                            {{ cube.name }} ({{ cube.owner }})
                                        </div>
                                    </div> -->
                                </template>
                                <img :src="card.urlFront" class="card-image list-image" loading="lazy" />
                            </el-tooltip>
                            <div class="card-info">
                                <div class="card-name">{{ card.name }}</div>
                                <div class="card-stats">Elo: {{ card.elo?.toFixed(0) || 'N/A' }}</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <el-row :gutter="20" class="content-sections" style="row-gap: 20px;">
            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="mostUniqueCube">
                    <template #header>
                        <h3>Most Unusual</h3>
                        <p class="subtitle">Cube with least cosine similarity to others</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="mostUniqueCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(mostUniqueCube.id)">{{ mostUniqueCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${mostUniqueCube.owner}`" target="_blank" rel="noopener">{{ mostUniqueCube.owner }}</a></p>
                                <div class="stat-highlight">
                                    <span>Avg Similarity: {{ (mostUniqueCube.avgSimilarity * 100).toFixed(2) }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="mostCurrentYearCube">
                    <template #header>
                        <h3>Most New Stuff</h3>
                        <p class="subtitle">Cube with most cards from {{ currentYear }}</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="mostCurrentYearCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(mostCurrentYearCube.id)">{{ mostCurrentYearCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${mostCurrentYearCube.owner}`" target="_blank" rel="noopener">{{ mostCurrentYearCube.owner }}</a></p>
                                <div class="stat-highlight">{{ mostCurrentYearCube.currentYearCards }} cards ({{ ((mostCurrentYearCube.currentYearCards / mostCurrentYearCube.stats.totalCards) * 100).toFixed(2) }}%)</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="newestAvgYearCube">
                    <template #header>
                        <h3>Zoomer Friendly</h3>
                        <p class="subtitle">Cube with newest average release year</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="newestAvgYearCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(newestAvgYearCube.id)">{{ newestAvgYearCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${newestAvgYearCube.owner}`" target="_blank" rel="noopener">{{ newestAvgYearCube.owner }}</a></p>
                                <div class="stat-highlight">Avg Year: {{ newestAvgYearCube.stats.averageReleaseYear?.toFixed(1) || 'N/A' }}</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="oldestAvgYearCube">
                    <template #header>
                        <h3>Boomer Magic</h3>
                        <p class="subtitle">Cube with oldest average release year</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="oldestAvgYearCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(oldestAvgYearCube.id)">{{ oldestAvgYearCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${oldestAvgYearCube.owner}`" target="_blank" rel="noopener">{{ oldestAvgYearCube.owner }}</a></p>
                                <div class="stat-highlight">Avg Year: {{ oldestAvgYearCube.stats.averageReleaseYear?.toFixed(1) || 'N/A' }}</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="mostUniversesBeyondCube">
                    <template #header>
                        <h3>Most Universes Beyond</h3>
                        <p class="subtitle">Cube with most cards originally from UB</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="mostUniversesBeyondCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(mostUniversesBeyondCube.id)">{{ mostUniversesBeyondCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${mostUniversesBeyondCube.owner}`" target="_blank" rel="noopener">{{ mostUniversesBeyondCube.owner }}</a></p>
                                <div class="stat-highlight">{{ mostUniversesBeyondCube.stats.cardCounts.universesBeyond }} cards ({{ ((mostUniversesBeyondCube.stats.cardCounts.universesBeyond / mostUniversesBeyondCube.stats.totalCards) * 100).toFixed(1) }}%)</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="mostSupplementalProductCube">
                    <template #header>
                        <h3>Most Supplemental Product</h3>
                        <p class="subtitle">Cube with most cards originally from SP</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="mostSupplementalProductCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(mostSupplementalProductCube.id)">{{ mostSupplementalProductCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${mostSupplementalProductCube.owner}`" target="_blank" rel="noopener">{{ mostSupplementalProductCube.owner }}</a></p>
                                <div class="stat-highlight">{{ mostSupplementalProductCube.stats.cardCounts.supplementalProduct }} cards ({{ ((mostSupplementalProductCube.stats.cardCounts.supplementalProduct / mostSupplementalProductCube.stats.totalCards) * 100).toFixed(1) }}%)</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="highestAvgPopularityCube">
                    <template #header>
                        <h3>Cards You Know</h3>
                        <p class="subtitle">Cube with highest average card popularity</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="highestAvgPopularityCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(highestAvgPopularityCube.id)">{{ highestAvgPopularityCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${highestAvgPopularityCube.owner}`" target="_blank" rel="noopener">{{ highestAvgPopularityCube.owner }}</a></p>
                                <div class="stat-highlight">Avg Popularity: {{ highestAvgPopularityCube.stats.averagePopularity.toFixed(2) }}%</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="lowestAvgPopularityCube">
                    <template #header>
                        <h3>Cards You Don't Know</h3>
                        <p class="subtitle">Cube with lowest average card popularity</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="lowestAvgPopularityCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(lowestAvgPopularityCube.id)">{{ lowestAvgPopularityCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${lowestAvgPopularityCube.owner}`" target="_blank" rel="noopener">{{ lowestAvgPopularityCube.owner }}</a></p>
                                <div class="stat-highlight">Avg Popularity: {{ lowestAvgPopularityCube.stats.averagePopularity.toFixed(2) }}%</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="mostWordyCube">
                    <template #header>
                        <h3>Most Wordy</h3>
                        <p class="subtitle">Cube with most average words per unique card</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="mostWordyCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(mostWordyCube.id)">{{ mostWordyCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${mostWordyCube.owner}`" target="_blank" rel="noopener">{{ mostWordyCube.owner }}</a></p>
                                <div class="stat-highlight">{{ mostWordyCube.stats.averageWordCountMinusParen.toFixed(1) }} avg words</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="leastWordyCube">
                    <template #header>
                        <h3>Least Wordy</h3>
                        <p class="subtitle">Cube with fewest average words per unique card</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="leastWordyCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(leastWordyCube.id)">{{ leastWordyCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${leastWordyCube.owner}`" target="_blank" rel="noopener">{{ leastWordyCube.owner }}</a></p>
                                <div class="stat-highlight">{{ leastWordyCube.stats.averageWordCountMinusParen.toFixed(1) }} avg words</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="mostRemovalCube">
                    <template #header>
                        <h3>Most Death and Destruction</h3>
                        <p class="subtitle">Cube with highest % cards tagged "removal"</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="mostRemovalCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(mostRemovalCube.id)">{{ mostRemovalCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${mostRemovalCube.owner}`" target="_blank" rel="noopener">{{ mostRemovalCube.owner }}</a></p>
                                <div class="stat-highlight">{{ (mostRemovalCube.stats.cardCounts?.removal || 0) }} cards ({{ ((mostRemovalCube.stats.cardCounts?.removal || 0) / (mostRemovalCube.stats.totalCards || 1) * 100).toFixed(1) }}%)</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8" :xs="24" :sm="12" :md="8">
                <el-card class="content-card" v-if="lowestRarityScoreCube">
                    <template #header>
                        <h3>Common Folk</h3>
                        <p class="subtitle">Cube with lowest blended rarity score</p>
                    </template>
                    <div class="cube-stat">
                        <div class="cube-info-compact">
                            <img :src="lowestRarityScoreCube.thumbnail" class="cube-thumbnail-small" loading="lazy" />
                            <div class="cube-details-compact">
                                <h4><a href="#" @click.prevent="openCubeDetailDialog(lowestRarityScoreCube.id)">{{ lowestRarityScoreCube.name }}</a></h4>
                                <p>by <a :href="`https://cubecobra.com/user/view/${lowestRarityScoreCube.owner}`" target="_blank" rel="noopener">{{ lowestRarityScoreCube.owner }}</a></p>
                                <div class="stat-highlight">Rarity Score: {{ lowestRarityScoreCube.stats.blendedRarityScore.toFixed(2) }}</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <el-row :gutter="20" class="content-sections">
            <!-- Top 10 Popular Sets -->
            <el-col :span="12" :xs="24">
                <el-card class="content-card">
                    <template #header>
                        <h3>Most Popular Sets</h3>
                        <p class="subtitle">By total number of non-land cards across all cubes; original release only</p>
                    </template>
                    <div class="set-list two-column">
                        <div v-for="(set, index) in topPopularSets" :key="set.setCode" class="set-item">
                            <div class="set-rank">{{ index + 1 }}</div>
                            <div class="set-info">
                                <div class="set-name">{{ set.setName }}</div>
                                <div class="set-stats">{{ set.cardCount.toLocaleString() }} cards</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <!-- Top 10 Popular Keywords -->
            <el-col :span="12" :xs="24">
                <el-card class="content-card">
                    <template #header>
                        <h3>Most Popular Keywords</h3>
                        <p class="subtitle">By total occurrences across all cubes (excluding evergreen)</p>
                    </template>
                    <div class="keyword-list two-column">
                        <div v-for="(keyword, index) in topPopularKeywords" :key="keyword.name" class="keyword-item">
                            <div class="keyword-rank">{{ index + 1 }}</div>
                            <div class="keyword-info">
                                <div class="keyword-name">{{ keyword.name }}</div>
                                <div class="keyword-stats">{{ keyword.count.toLocaleString() }} occurrences</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <CubeDetailDialog
            v-model:visible="cubeDetailDialogVisible"
            :cubeRow="cubeDetailDialogRow"
            :cubeCards="cubeDetailDialogCards"
            :similarityMatrix="similarityMatrix"
            :overviewTableData="overviewTableData"
            :loadedCubes="loadedCubes"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getSetName } from '../util/CubeFunctions';
import { isEvergreenKeyword } from '../util/Keywords';
import CubeDetailDialog from '../components/CubeDetailDialog.vue';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
    similarityMatrix: {
        type: Object,
        required: true,
    },
    overviewTableData: {
        type: Array,
        required: true,
    },
});

const cubeDetailDialogId = ref(null);
const cubeDetailDialogVisible = computed({
    get: () => cubeDetailDialogId.value !== null,
    set: (val) => { if (!val) cubeDetailDialogId.value = null; },
});
const cubeDetailDialogRow = computed(() => {
    if (!cubeDetailDialogId.value) return null;
    return props.overviewTableData.find(c => c.id === cubeDetailDialogId.value) || null;
});
const cubeDetailDialogCards = computed(() => {
    if (!cubeDetailDialogId.value) return [];
    return props.loadedCubes[cubeDetailDialogId.value]?.cards || [];
});
const openCubeDetailDialog = (cubeId) => {
    cubeDetailDialogId.value = cubeId;
};

const totalCubes = computed(() => Object.keys(props.loadedCubes).length);

const totalCards = computed(() => {
    return Object.values(props.loadedCubes).reduce((sum, cube: any) => sum + cube.stats.totalCards, 0);
});

const totalUniqueCards = computed(() => {
    const allCards = new Set<string>();
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.oracleId) {
                allCards.add(card.oracleId);
            }
        });
    });
    return allCards.size;
});

const averageCardsPerCube = computed(() => {
    if (totalCubes.value === 0) return 0;
    return totalCards.value / totalCubes.value;
});

// Count how many cubes each card appears in
const cardCubeCounts = computed(() => {
    const cardCounts = new Map<string, { count: number; card: any }>();

    Object.values(props.loadedCubes).forEach((cube: any) => {
        const uniqueCards = new Set<string>();
        cube.cards.forEach((card: any) => {
            if (card.oracleId && !uniqueCards.has(card.oracleId)) {
                uniqueCards.add(card.oracleId);

                if (!cardCounts.has(card.oracleId)) {
                    cardCounts.set(card.oracleId, { count: 0, card });
                }
                cardCounts.get(card.oracleId)!.count++;
            }
        });
    });

    return cardCounts;
});

const uniqueOnlyCards = computed(() => {
    let count = 0;
    cardCubeCounts.value.forEach((data) => {
        if (data.count === 1) count++;
    });
    return count;
});

const topPopularCards = computed(() => {
    const cards = Array.from(cardCubeCounts.value.entries())
        .filter(([oracleId, data]) => {
            // Filter out lands
            return !data.card.effectiveTypes?.includes('Land');
        })
        .map(([oracleId, data]) => ({
            ...data.card,
            cubeCount: data.count,
        }))
        .sort((a, b) => a.popularity - b.popularity) // Reverse sort by popularity.
        .sort((a, b) => b.cubeCount - a.cubeCount)
        .slice(0, 10);

    return cards;
});

const topLowEloCards = computed(() => {
    const cardCubeMap = new Map<string, { card: any; cubes: any[] }>();

    // First pass: collect all cards and track which cubes contain them
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.elo !== undefined && card.elo !== null) {
                if (!cardCubeMap.has(card.oracleId)) {
                    cardCubeMap.set(card.oracleId, { card, cubes: [] });
                }

                const existingEntry = cardCubeMap.get(card.oracleId)!;
                existingEntry.cubes.push({ id: cube.id, name: cube.name, owner: cube.owner });

                // Keep the card with the lowest elo
                if (card.elo < existingEntry.card.elo) {
                    existingEntry.card = card;
                }
            }
        });
    });

    return Array.from(cardCubeMap.values())
        .map(entry => ({
            ...entry.card,
            containingCubes: entry.cubes
        }))
        .sort((a, b) => a.elo - b.elo)
        .slice(0, 10);
});

const currentYear = computed(() => new Date().getFullYear());

const mostCurrentYearCube = computed(() => {
    if (totalCubes.value === 0) return null;

    let maxCurrentYearCards = 0;
    let topCube = null;

    Object.values(props.loadedCubes).forEach((cube: any) => {
        const currentYearCards = cube.stats.releaseYearDistribution?.[currentYear.value] || 0;

        if (currentYearCards > maxCurrentYearCards) {
            maxCurrentYearCards = currentYearCards;
            topCube = {
                ...cube,
                currentYearCards,
            };
        }
    });

    return topCube;
});

const highestAvgPopularityCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((highest: any, cube: any) => {
        if (!highest || cube.stats.averagePopularity > highest.stats.averagePopularity) {
            return cube;
        }
        return highest;
    }, null);
});

const newestAvgYearCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((newest: any, cube: any) => {
        if (!cube.stats.averageReleaseYear) return newest;
        if (!newest || cube.stats.averageReleaseYear > newest.stats.averageReleaseYear) {
            return cube;
        }
        return newest;
    }, null);
});

const oldestAvgYearCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((oldest: any, cube: any) => {
        if (!cube.stats.averageReleaseYear) return oldest;
        if (!oldest || cube.stats.averageReleaseYear < oldest.stats.averageReleaseYear) {
            return cube;
        }
        return oldest;
    }, null);
});

const leastWordyCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((least: any, cube: any) => {
        if (!least || cube.stats.averageWordCountMinusParen < least.stats.averageWordCountMinusParen) {
            return cube;
        }
        return least;
    }, null);
});

const lowestAvgPopularityCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((lowest: any, cube: any) => {
        if (!lowest || cube.stats.averagePopularity < lowest.stats.averagePopularity) {
            return cube;
        }
        return lowest;
    }, null);
});

const mostUniversesBeyondCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((most: any, cube: any) => {
        const ubCount = cube.stats.cardCounts?.universesBeyond || 0;
        if (!most || ubCount > (most.stats.cardCounts?.universesBeyond || 0)) {
            return cube;
        }
        return most;
    }, null);
});

const mostSupplementalProductCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((most: any, cube: any) => {
        const spCount = cube.stats.cardCounts?.supplementalProduct || 0;
        if (!most || spCount > (most.stats.cardCounts?.supplementalProduct || 0)) {
            return cube;
        }
        return most;
    }, null);
});

const mostWordyCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((wordiest: any, cube: any) => {
        if (!wordiest || cube.stats.averageWordCountMinusParen > wordiest.stats.averageWordCountMinusParen) {
            return cube;
        }
        return wordiest;
    }, null);
});

const mostRemovalCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((most: any, cube: any) => {
        const removalPercentage = (cube.stats.cardCounts?.removal || 0) / (cube.stats.totalCards || 1);
        if (!most || removalPercentage > ((most.stats.cardCounts?.removal || 0) / (most.stats.totalCards || 1))) {
            return cube;
        }
        return most;
    }, null);
});

const mostUniqueCube = computed(() => {
    if (totalCubes.value < 2) return null;

    let lowestAvgSimilarity = 1;
    let mostUnique = null;

    Object.entries(props.loadedCubes).forEach(([id, cube]: [string, any]) => {
        const scores = props.similarityMatrix[id] || {};
        const otherCubes = Object.keys(props.loadedCubes).filter(otherId => otherId !== id);

        if (otherCubes.length === 0) return;

        const totalScore = Object.values(scores).reduce((acc: number, score: any) => acc + score.cosineSimilarity, 0);
        const avgSimilarity = totalScore / otherCubes.length;

        if (avgSimilarity < lowestAvgSimilarity) {
            lowestAvgSimilarity = avgSimilarity;
            mostUnique = {
                ...cube,
                avgSimilarity,
            };
        }
    });

    return mostUnique;
});

const topPopularSets = computed(() => {
    const setCounts = new Map<string, number>();

    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            // Exclude lands
            if (!card.effectiveTypes?.includes('Land') && card.setCode) {
                const count = setCounts.get(card.setCode) || 0;
                setCounts.set(card.setCode, count + 1);
            }
        });
    });

    return Array.from(setCounts.entries())
        .map(([setCode, count]) => ({
            setCode,
            setName: getSetName(setCode),
            cardCount: count
        }))
        .sort((a, b) => b.cardCount - a.cardCount)
        .slice(0, 10);
});

const topPopularKeywords = computed(() => {
    const keywordCounts = new Map<string, number>();

    Object.values(props.loadedCubes).forEach((cube: any) => {
        Object.entries(cube.stats.keywords || {}).forEach(([keyword, count]: [string, any]) => {
            if (!isEvergreenKeyword(keyword)) {
                const totalCount = keywordCounts.get(keyword) || 0;
                keywordCounts.set(keyword, totalCount + count);
            }
        });
    });

    return Array.from(keywordCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
});

const lowestRarityScoreCube = computed(() => {
    if (totalCubes.value === 0) return null;

    return Object.values(props.loadedCubes).reduce((lowest: any, cube: any) => {
        if (!lowest || cube.stats.blendedRarityScore < lowest.stats.blendedRarityScore) {
            return cube;
        }
        return lowest;
    }, null);
});
</script>

<style lang="scss" scoped>
.infographic {
    padding: 20px 0;
}

.stats-cards {
    margin-bottom: 30px;
}

.stat-card {
    text-align: center;

    .stat-number {
        font-size: 2.5rem;
        font-weight: bold;
        color: var(--el-color-primary);
        line-height: 1;
    }

    .stat-label {
        font-size: 0.875rem;
        color: var(--el-text-color-secondary);
        margin-top: 8px;
        line-height: 1.2;
    }
}

.content-sections {
    margin-bottom: 30px;
}

.content-card {
    height: 100%;

    h3 {
        margin: 0 0 4px 0;
        color: var(--el-text-color-primary);
    }

    .subtitle {
        margin: 0;
        font-size: 0.875rem;
        color: var(--el-text-color-secondary);
    }
}

.card-list {
    &.two-column {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .card-item {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
        padding: 8px;
        border-radius: 6px;
        transition: background-color 0.2s;

        &:hover {
            background-color: var(--el-fill-color-light);
        }

        .card-rank {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--el-color-primary);
            margin-right: 12px;
            min-width: 24px;
        }

        .card-image {
            &.list-image {
                width: 50px;
                height: 70px;
                object-fit: cover;
                border-radius: 4px;
                margin-right: 12px;
                cursor: pointer;
            }
        }

        .card-info {
            flex: 1;
            min-width: 0;

            .card-name {
                font-weight: 500;
                color: var(--el-text-color-primary);
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .card-stats {
                font-size: 0.875rem;
                color: var(--el-text-color-secondary);
            }
        }
    }
}

.set-list, .keyword-list {
    &.two-column {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .set-item, .keyword-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding: 8px;
        border-radius: 6px;
        transition: background-color 0.2s;

        &:hover {
            background-color: var(--el-fill-color-light);
        }

        .set-rank, .keyword-rank {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--el-color-primary);
            margin-right: 12px;
            min-width: 24px;
        }

        .set-info, .keyword-info {
            flex: 1;
            min-width: 0;

            .set-name, .keyword-name {
                font-weight: 500;
                color: var(--el-text-color-primary);
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .set-stats, .keyword-stats {
                font-size: 0.875rem;
                color: var(--el-text-color-secondary);
            }
        }
    }
}

.set-list, .keyword-list {
    .set-item, .keyword-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding: 8px;
        border-radius: 6px;
        transition: background-color 0.2s;

        &:hover {
            background-color: var(--el-fill-color-light);
        }

        .set-rank, .keyword-rank {
            font-weight: bold;
            color: var(--el-color-primary);
            margin-right: 12px;
            min-width: 24px;
        }

        .set-info, .keyword-info {
            flex: 1;
            min-width: 0;

            .set-name, .keyword-name {
                font-weight: 500;
                color: var(--el-text-color-primary);
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .set-stats, .keyword-stats {
                font-size: 0.875rem;
                color: var(--el-text-color-secondary);
            }
        }
    }
}

.cube-stat {
    .cube-info-compact {
        display: flex;
        align-items: center;
        gap: 12px;

        .cube-thumbnail-small {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 6px;
            flex-shrink: 0;
        }

        .cube-details-compact {
            flex: 1;
            min-width: 0;

            h4 {
                margin: 0 0 2px 0;
                color: var(--el-text-color-primary);
                font-size: 1rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;

                a {
                    color: inherit;
                    text-decoration: none;

                    &:hover {
                        color: var(--el-color-primary);
                    }
                }
            }

            p {
                margin: 0 0 4px 0;
                color: var(--el-text-color-secondary);
                font-size: 0.875rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;

                a {
                    color: inherit;
                    text-decoration: none;

                    &:hover {
                        color: var(--el-color-primary);
                    }
                }
            }

            .stat-highlight {
                font-weight: 500;
                color: var(--el-color-primary);
                font-size: 0.875rem;
            }
        }
    }
}

// Card tooltip styles matching CardSummaryTable.vue
</style>

<style lang="scss">
.card-tooltip {
    padding: 6px 8px !important;
    width: 250px !important;
    // height: 350px !important;
    // min-height: 450px;

    .card-image {
        width: 100% !important;
        height: auto !important;
        border-radius: 4.75% / 3.5%;
        flex-shrink: 0;

        &.lea {
            border-radius: 7% / 5.5%;

            &:last-child {
                margin-bottom: 0;
            }
        }
    }

    .card-image.list-image {
        width: 40px;
        height: 56px;
    }

    .cube-list {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--el-border-color-lighter);
        flex: 1;
        overflow-y: auto;

        .cube-name {
            font-size: 0.75rem;
            color: var(--el-text-color-secondary);
            margin-top: 2px;
        }
    }

    .unique-cube .cube-info {
        flex-direction: column;
        text-align: center;

        .cube-details .cube-stats {
            justify-content: center;
        }
    }

    // Mobile responsiveness for cube statistics
    @media (max-width: 768px) {
        .cube-info-compact {
            flex-direction: column;
            text-align: center;

            .cube-name {
                margin-bottom: 4px;
            }

            .cube-stats {
                justify-content: center;
                flex-wrap: wrap;
                gap: 8px;

                .cube-stat {
                    font-size: 0.85em;
                }
            }
        }

        .statistic-cards .el-row .el-col {
            margin-bottom: 16px;
        }

        .card-list.two-column {
            grid-template-columns: 1fr;
        }
    }
}
</style>
