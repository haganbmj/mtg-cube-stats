<template>
    <el-row>
        <el-col :span="24">
            <el-form-item label="Highlight Cube:" style="width: 100%;">
                <el-select
                    v-model="highlightedCubeId"
                    clearable
                    label="Highlighted Cube"
                    placeholder="Select a cube to highlight"
                >
                    <el-option
                        v-for="item in cubeIds"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </el-select>
            </el-form-item>
        </el-col>
    </el-row>

    <el-card class="archetype-analysis-card">
        <template #header>
            <div class="card-header">
                <h3>Supported Themes Across All Cubes</h3>
                <el-text tag="small" type="info">
                    Aggregate theme support across {{ Object.keys(loadedCubes).length }} cubes
                </el-text>
            </div>
        </template>

        <div v-if="aggregateArchetypes.length === 0" class="no-archetypes">
            <el-empty description="No theme support detected">
                <el-text type="info">
                    No cubes loaded or no theme patterns found.
                </el-text>
            </el-empty>
        </div>

        <div v-else>
            <!-- Theme table -->
            <el-table
                :data="aggregateArchetypes"
                style="width: 100%"
                :default-sort="{ prop: 'avgPercentage', order: 'descending' }"
                stripe
            >
                <el-table-column prop="name" label="Theme" min-width="140">
                    <template #default="{ row }">
                        <div class="archetype-name">
                            <div
                                class="archetype-color-indicator"
                                :style="{ backgroundColor: row.color }"
                            ></div>
                            <span>{{ row.name }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />

                <el-table-column prop="cubesSupporting" label="Cubes" width="80" align="center" sortable>
                    <template #default="{ row }">
                        {{ row.cubesSupporting }} / {{ totalCubes }}
                    </template>
                </el-table-column>

                <el-table-column prop="uniqueCards" label="Unique Cards" width="110" align="center" sortable />

                <el-table-column prop="avgSupport" label="Avg Cards" width="120" align="center" sortable>
                    <template #default="{ row }">
                        {{ row.avgSupport.toFixed(1) }}
                    </template>
                </el-table-column>

                <el-table-column prop="avgPercentage" label="Avg %" width="100" align="center" sortable>
                    <template #default="{ row }">
                        {{ row.avgPercentage.toFixed(1) }}%
                    </template>
                </el-table-column>

                <!-- Highlighted cube columns -->
                <template v-if="highlightedCubeId && highlightedCubeData">
                    <el-table-column :label="`Highlighted Cards`" width="120" align="center">
                        <template #default="{ row }">
                            <div class="highlighted-cell">
                                <span>
                                    {{ getHighlightedCubeSupport(row.name) }}
                                </span>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column :label="`Highlighted %`" width="120" align="center">
                        <template #default="{ row }">
                            <div class="highlighted-cell" :class="getComparisonClass(row.name, 'percentage')">
                                <span>
                                    <el-icon v-if="getComparisonArrow(row.name) === 'up'" class="comparison-arrow">
                                        <CaretTop />
                                    </el-icon>
                                    <el-icon v-else-if="getComparisonArrow(row.name) === 'down'" class="comparison-arrow">
                                        <CaretBottom />
                                    </el-icon>
                                    {{ getHighlightedCubePercentage(row.name) }}%
                                </span>
                            </div>
                        </template>
                    </el-table-column>
                </template>

                <el-table-column type="expand">
                    <template #default="{ row }">
                        <div class="archetype-details">
                            <el-row :gutter="20">
                                <el-col :span="12">
                                    <h4>Cubes Supporting {{ row.name }} ({{ row.cubesSupporting }}):</h4>
                                    <el-table
                                        :data="getSupportingCubeDetails(row.supportingCubes)"
                                        style="width: 100%;"
                                        max-height="300"
                                        size="small"
                                    >
                                        <el-table-column prop="name" label="Cube Name" min-width="120">
                                            <template #default="{ row: cubeRow }">
                                                <el-tooltip :content="`Owner: ${cubeRow.owner}`" placement="top" :hide-after="50">
                                                    <el-link
                                                        v-if="cubeRow.id"
                                                        @click="openCubeDetailDialog(cubeRow.id)"
                                                        :type="cubeRow.name === highlightedCubeName ? 'primary' : 'default'"
                                                    >
                                                        {{ cubeRow.name }}
                                                    </el-link>
                                                    <span v-else>{{ cubeRow.name }}</span>
                                                </el-tooltip>
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="size" label="Size" width="80" align="center" sortable />
                                        <el-table-column label="Actions" width="100" align="center">
                                            <template #default="{ row: cubeRow }">
                                                <el-button
                                                    v-if="cubeRow.id"
                                                    size="small"
                                                    :type="cubeRow.name === highlightedCubeName ? 'primary' : 'default'"
                                                    @click="highlightedCubeId = cubeRow.name === highlightedCubeName ? '' : cubeRow.id"
                                                >
                                                    {{ cubeRow.name === highlightedCubeName ? 'Highlighted' : 'Highlight' }}
                                                </el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </el-col>
                                <el-col :span="12">
                                    <h4 v-if="highlightedCubeId && highlightedCubeData">{{ highlightedCubeName }} Supporting Cards ({{ getHighlightedArchetypeCards(row.name).length }}):</h4>
                                    <h4 v-else>Most Common Supporting Cards ({{ getMostCommonArchetypeCards(row.name).length }}):</h4>
                                    <div v-if="(highlightedCubeId ? getHighlightedArchetypeCards(row.name) : getMostCommonArchetypeCards(row.name)).length > 0" class="supporting-cards">
                                        <el-tooltip
                                            v-for="cardInfo in (highlightedCubeId ? getHighlightedArchetypeCards(row.name) : getMostCommonArchetypeCards(row.name)).slice(0, Math.min((showAllCards[row.name] || 8), (highlightedCubeId ? getHighlightedArchetypeCards(row.name) : getMostCommonArchetypeCards(row.name)).length))"
                                            :key="highlightedCubeId ? cardInfo : cardInfo.name"
                                            effect="dark"
                                            placement="top"
                                            popper-class="card-image-tooltip"
                                            :show-after="500"
                                        >
                                            <template #content>
                                                <div class="card-tooltip-content">
                                                    <el-image
                                                        :src="highlightedCubeId ? getCardImageUrl(cardInfo) : getCommonCardImageUrl(cardInfo.name)"
                                                        fit="contain"
                                                        :alt="highlightedCubeId ? cardInfo : cardInfo.name"
                                                        :class="'card-tooltip-image ' + (highlightedCubeId ? (getCardByName(cardInfo)?.setCode?.toLowerCase() || '') : (getCommonCardByName(cardInfo.name)?.setCode?.toLowerCase() || ''))"
                                                        @error="handleImageError"
                                                    />
                                                </div>
                                            </template>
                                            <div class="card-thumbnail-container" :class="{ 'common-card': !highlightedCubeId }">
                                                <el-image
                                                    :src="highlightedCubeId ? getCardImageUrl(cardInfo) : getCommonCardImageUrl(cardInfo.name)"
                                                    fit="cover"
                                                    :alt="highlightedCubeId ? cardInfo : cardInfo.name"
                                                    :class="'card-thumbnail ' + (highlightedCubeId ? (getCardByName(cardInfo)?.setCode?.toLowerCase() || '') : (getCommonCardByName(cardInfo.name)?.setCode?.toLowerCase() || ''))"
                                                    @error="handleThumbnailError"
                                                />
                                                <div v-if="!highlightedCubeId" class="card-frequency">
                                                    {{ cardInfo.frequency }}
                                                </div>
                                            </div>
                                        </el-tooltip>
                                        <el-button
                                            v-if="(highlightedCubeId ? getHighlightedArchetypeCards(row.name) : getMostCommonArchetypeCards(row.name)).length > (showAllCards[row.name] || 8)"
                                            link
                                            type="primary"
                                            size="small"
                                            @click="showAllCards[row.name] = (showAllCards[row.name] || 8) + 8"
                                        >
                                            Show {{ Math.min(8, (highlightedCubeId ? getHighlightedArchetypeCards(row.name) : getMostCommonArchetypeCards(row.name)).length - (showAllCards[row.name] || 8)) }} more...
                                        </el-button>
                                        <el-button
                                            v-if="(showAllCards[row.name] || 8) > 8"
                                            link
                                            type="primary"
                                            size="small"
                                            @click="showAllCards[row.name] = 8"
                                        >
                                            Show less
                                        </el-button>
                                    </div>
                                    <el-text v-else type="info">No supporting cards</el-text>
                                </el-col>
                            </el-row>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-card>

</template>

<script setup lang="ts">
import { computed, ref, watch, inject } from 'vue';
import { CaretTop, CaretBottom } from '@element-plus/icons-vue';
import { detectCubeArchetypes } from '../util/ArchetypeDetection';

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

const highlightedCubeId = ref<string>('');
const showAllCubes = ref({});
const showAllCards = ref({});

const openCubeDetailDialog = inject('openCubeDetailDialog');

// Error handling functions for card images
const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
        parent.innerHTML = '<div class="card-name-fallback">Image not available</div>';
    }
};

const handleThumbnailError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    const container = img.parentElement;
    if (container) {
        img.style.display = 'none';
        container.classList.add('image-failed');
    }
};

const cubeIds = computed(() => {
    return Object.values(props.loadedCubes).map(cube => {
        return {
            label: `${cube.name} (${cube.owner})`,
            value: cube.id,
        };
    }).sort((a, b) => a.label.localeCompare(b.label));
});

const totalCubes = computed(() => {
    return Object.keys(props.loadedCubes).length;
});

const highlightedCubeData = computed(() => {
    if (!highlightedCubeId.value) return null;
    return Object.values(props.loadedCubes).find(cube => cube.id === highlightedCubeId.value);
});

const highlightedCubeName = computed(() => {
    return highlightedCubeData.value?.name || '';
});

// Reset displayed cards count when highlighted cube changes
watch(highlightedCubeId, () => {
    showAllCards.value = {};
});

// Function to get card object by name from highlighted cube cards
const getCardByName = (cardName: string) => {
    if (!highlightedCubeData.value) return null;
    return highlightedCubeData.value.cards.find(card => card.name === cardName);
};

// Function to get card image URL from card model
const getCardImageUrl = (cardName: string) => {
    const card = getCardByName(cardName);
    return card?.urlFront || '';
};

// Function to get common card by name across all cubes
const getCommonCardByName = (cardName: string) => {
    for (const cube of Object.values(props.loadedCubes)) {
        const card = cube.cards.find(c => c.name === cardName);
        if (card) return card;
    }
    return null;
};

// Function to get common card image URL
const getCommonCardImageUrl = (cardName: string) => {
    const card = getCommonCardByName(cardName);
    return card?.urlFront || '';
};

// Function to get most common supporting cards for an archetype
const getMostCommonArchetypeCards = (archetypeName: string) => {
    const archetype = aggregateArchetypes.value.find(a => a.name === archetypeName);
    if (!archetype) return [];

    const cardFrequency = {};

    // Count frequency of each card across all supporting cubes
    Object.values(archetype.cubeData).forEach(cubeData => {
        cubeData.cards.forEach(cardName => {
            if (!cardFrequency[cardName]) {
                cardFrequency[cardName] = 0;
            }
            cardFrequency[cardName]++;
        });
    });

    // Sort by frequency and return top cards
    return Object.entries(cardFrequency)
        .map(([name, frequency]) => ({ name, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20); // Show max 20 most common cards
};

// Function to get supporting cube details for table
const getSupportingCubeDetails = (cubeNames: string[]) => {
    return cubeNames.map(cubeName => {
        const cube = Object.values(props.loadedCubes).find(c => c.name === cubeName);
        return {
            name: cubeName,
            id: cube?.id || '',
            owner: cube?.owner || 'Unknown',
            size: cube?.stats?.totalCards || 0,
        };
    }).sort((a, b) => b.size - a.size);
};

const aggregateArchetypes = computed(() => {
    const archetypeMap = {};
    const cubeArchetypes = {};

    // Get archetype data for each cube
    Object.entries(props.loadedCubes).forEach(([cubeId, cube]) => {
        const cubeArchetypeData = detectCubeArchetypes(cube.cards);
        cubeArchetypes[cubeId] = cubeArchetypeData;

        cubeArchetypeData.forEach(archetype => {
            if (!archetypeMap[archetype.name]) {
                archetypeMap[archetype.name] = {
                    name: archetype.name,
                    description: archetype.description,
                    color: archetype.color,
                    threshold: archetype.threshold,
                    cubesSupporting: 0,
                    totalCards: 0,
                    uniqueOracleIds: new Set(),
                    supportingCubes: [],
                    cubeData: {},
                };
            }

            archetypeMap[archetype.name].cubesSupporting += 1;
            archetypeMap[archetype.name].totalCards += archetype.count;
            archetypeMap[archetype.name].supportingCubes.push(cube.name);
            archetypeMap[archetype.name].cubeData[cubeId] = {
                count: archetype.count,
                cards: archetype.cards,
                percentage: archetype.percentage,
            };

            // Track unique oracle IDs for this archetype
            archetype.cards.forEach(cardName => {
                const card = cube.cards.find(c => c.name === cardName);
                if (card && card.oracleId) {
                    archetypeMap[archetype.name].uniqueOracleIds.add(card.oracleId);
                }
            });
        });
    });

    // Calculate averages and sort
    return Object.values(archetypeMap)
        .map(archetype => ({
            ...archetype,
            uniqueCards: archetype.uniqueOracleIds.size,
            avgSupport: archetype.totalCards / archetype.cubesSupporting,
            avgPercentage: archetype.cubesSupporting > 0
                ? Object.values(archetype.cubeData).reduce((sum, data) => sum + parseFloat(data.percentage), 0) / archetype.cubesSupporting
                : 0,
            supportPercentage: (archetype.cubesSupporting / totalCubes.value) * 100,
        }))
        .sort((a, b) => b.avgSupport - a.avgSupport);
});

const getHighlightedCubeSupport = (archetypeName: string) => {
    if (!highlightedCubeId.value) return 0;
    const archetype = aggregateArchetypes.value.find(a => a.name === archetypeName);
    return archetype?.cubeData[highlightedCubeId.value]?.count || 0;
};

const getHighlightedCubePercentage = (archetypeName: string) => {
    if (!highlightedCubeId.value) return '0.0';
    const archetype = aggregateArchetypes.value.find(a => a.name === archetypeName);
    return archetype?.cubeData[highlightedCubeId.value]?.percentage || '0.0';
};

const getHighlightedArchetypeCards = (archetypeName: string) => {
    if (!highlightedCubeId.value) return [];
    const archetype = aggregateArchetypes.value.find(a => a.name === archetypeName);
    return archetype?.cubeData[highlightedCubeId.value]?.cards || [];
};

const getComparisonClass = (archetypeName: string, type: 'cards' | 'percentage') => {
    if (!highlightedCubeId.value) return '';

    const archetype = aggregateArchetypes.value.find(a => a.name === archetypeName);
    if (!archetype) return '';

    const highlightedValue = type === 'cards'
        ? getHighlightedCubeSupport(archetypeName)
        : parseFloat(getHighlightedCubePercentage(archetypeName));

    const avgValue = type === 'cards'
        ? archetype.avgSupport
        : archetype.avgPercentage;

    const ratio = highlightedValue / avgValue;

    if (ratio > 1.5) return 'comparison-high';
    if (ratio > 1.2) return 'comparison-above';
    if (ratio < 0.5) return 'comparison-low';
    if (ratio < 0.8) return 'comparison-below';
    return 'comparison-normal';
};

const getComparisonArrow = (archetypeName: string) => {
    if (!highlightedCubeId.value) return '';

    const archetype = aggregateArchetypes.value.find(a => a.name === archetypeName);
    if (!archetype) return '';

    const highlightedValue = parseFloat(getHighlightedCubePercentage(archetypeName));
    const avgValue = archetype.avgPercentage;
    const ratio = highlightedValue / avgValue;

    if (ratio > 1.2) return 'up';
    if (ratio < 0.8) return 'down';
    return '';
};
</script>

<style scoped>
.archetype-analysis-card {
    margin: 16px 0;
}

.card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.card-header h3 {
    margin: 0;
}

.no-archetypes {
    text-align: center;
    padding: 40px 20px;
}

.archetype-name {
    display: flex;
    align-items: center;
    gap: 8px;
}

.archetype-color-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.archetype-details {
    padding: 16px 24px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 4px;
}

.archetype-details h4 {
    margin: 0 0 12px 0;
    color: var(--el-text-color-primary);
}



.supporting-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}

.card-thumbnail-container {
    position: relative;
    width: 120px;
    height: 168px;
    border-radius: 8px;
    overflow: hidden;
    cursor: help;
    transition: transform 0.2s ease;
    border: 2px solid transparent;
}

.card-thumbnail-container:hover {
    transform: scale(1.05);
    border-color: var(--el-color-primary);
}

.card-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 4.75% / 3.5%;
}

.card-thumbnail.lea {
    border-radius: 7% / 5.5%;
}

.highlighted-cell {
    font-weight: 600;
}

.comparison-arrow {
    margin-left: 4px;
    font-weight: bold;
    font-size: 14px;
}

.comparison-high {
    color: #006400;
}

.comparison-above {
    color: #90EE90;
}

.comparison-normal {
    color: var(--el-text-color-primary);
}

.comparison-below {
    color: #FFB6C1;
}

.comparison-low {
    color: #8B0000;
}

.card-tooltip-content {
    padding: 0;
    margin: 0;
    max-width: 250px;
}

.card-tooltip-image {
    width: 100%;
    height: auto;
    border-radius: 4px;
    display: block;
}

.card-name-fallback {
    padding: 8px;
    text-align: center;
    color: #999;
    font-size: 12px;
}

.image-failed {
    background-color: var(--el-fill-color-light);
    border: 1px dashed var(--el-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    text-align: center;
    padding: 8px;
}

@media (max-width: 768px) {
    .supporting-cards {
        justify-content: flex-start;
        gap: 6px;
    }

    .card-thumbnail-container {
        width: 90px;
        height: 126px;
    }

    .card-tooltip-content {
        max-width: 200px;
    }
}

.card-thumbnail-container.common-card {
    position: relative;
}

.card-frequency {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 16px;
    font-weight: bold;
    padding: 2px 4px;
    border-radius: 3px;
    min-width: 16px;
    text-align: center;
}
</style>
