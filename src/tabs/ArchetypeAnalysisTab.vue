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

                <el-table-column prop="totalCards" label="Total Cards" width="110" align="center" sortable />

                <el-table-column prop="avgSupport" label="Avg Cards" width="100" align="center" sortable>
                    <template #default="{ row }">
                        {{ row.avgSupport.toFixed(1) }}
                    </template>
                </el-table-column>

                <el-table-column prop="avgPercentage" label="Avg %" width="80" align="center" sortable>
                    <template #default="{ row }">
                        {{ row.avgPercentage.toFixed(1) }}%
                    </template>
                </el-table-column>

                <!-- Highlighted cube columns -->
                <template v-if="highlightedCubeId && highlightedCubeData">
                    <el-table-column :label="`${highlightedCubeName} Cards`" width="120" align="center">
                        <template #default="{ row }">
                            <div class="highlighted-cell">
                                <span :class="getComparisonClass(row.name, 'cards')">
                                    {{ getHighlightedCubeSupport(row.name) }}
                                </span>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column :label="`${highlightedCubeName} %`" width="100" align="center">
                        <template #default="{ row }">
                            <div class="highlighted-cell">
                                <span :class="getComparisonClass(row.name, 'percentage')">
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
                                                        :href="`https://cubecobra.com/cube/list/${cubeRow.id}`"
                                                        target="_blank"
                                                        :type="cubeRow.name === highlightedCubeName ? 'primary' : 'default'"
                                                    >
                                                        {{ cubeRow.name }}
                                                    </el-link>
                                                    <span v-else>{{ cubeRow.name }}</span>
                                                </el-tooltip>
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="size" label="Size" width="80" align="center" sortable />
                                    </el-table>
                                </el-col>
                                <el-col :span="12" v-if="highlightedCubeId && highlightedCubeData">
                                    <h4>{{ highlightedCubeName }} Supporting Cards ({{ getHighlightedArchetypeCards(row.name).length }}):</h4>
                                    <div v-if="getHighlightedArchetypeCards(row.name).length > 0" class="supporting-cards">
                                        <el-tooltip
                                            v-for="cardName in getHighlightedArchetypeCards(row.name).slice(0, showAllCards[row.name] ? getHighlightedArchetypeCards(row.name).length : 8)"
                                            :key="cardName"
                                            effect="dark"
                                            placement="top"
                                            popper-class="card-image-tooltip"
                                            :show-after="500"
                                        >
                                            <template #content>
                                                <div class="card-tooltip-content">
                                                    <el-image
                                                        :src="getCardImageUrl(cardName)"
                                                        fit="contain"
                                                        :alt="cardName"
                                                        :class="'card-tooltip-image ' + (getCardByName(cardName)?.setCode?.toLowerCase() || '')"
                                                        @error="handleImageError"
                                                    />
                                                </div>
                                            </template>
                                            <div class="card-thumbnail-container">
                                                <el-image
                                                    :src="getCardImageUrl(cardName)"
                                                    fit="cover"
                                                    :alt="cardName"
                                                    :class="'card-thumbnail ' + (getCardByName(cardName)?.setCode?.toLowerCase() || '')"
                                                    @error="handleThumbnailError"
                                                />
                                            </div>
                                        </el-tooltip>
                                        <el-button
                                            v-if="getHighlightedArchetypeCards(row.name).length > 8 && !showAllCards[row.name]"
                                            link
                                            type="primary"
                                            size="small"
                                            @click="showAllCards[row.name] = true"
                                        >
                                            Show {{ getHighlightedArchetypeCards(row.name).length - 8 }} more...
                                        </el-button>
                                        <el-button
                                            v-if="showAllCards[row.name]"
                                            link
                                            type="primary"
                                            size="small"
                                            @click="showAllCards[row.name] = false"
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
import { computed, ref } from 'vue';
import { detectCubeArchetypes } from '../util/ArchetypeDetection.mjs';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const highlightedCubeId = ref<string>('');
const showAllCubes = ref({});
const showAllCards = ref({});

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
                    supportingCubes: [],
                    cubeData: {}
                };
            }

            archetypeMap[archetype.name].cubesSupporting += 1;
            archetypeMap[archetype.name].totalCards += archetype.count;
            archetypeMap[archetype.name].supportingCubes.push(cube.name);
            archetypeMap[archetype.name].cubeData[cubeId] = {
                count: archetype.count,
                cards: archetype.cards,
                percentage: archetype.percentage
            };
        });
    });

    // Calculate averages and sort
    return Object.values(archetypeMap)
        .map(archetype => ({
            ...archetype,
            avgSupport: archetype.totalCards / archetype.cubesSupporting,
            avgPercentage: archetype.cubesSupporting > 0
                ? Object.values(archetype.cubeData).reduce((sum, data) => sum + parseFloat(data.percentage), 0) / archetype.cubesSupporting
                : 0,
            supportPercentage: (archetype.cubesSupporting / totalCubes.value) * 100
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

.comparison-high {
    color: #67c23a;
    background-color: rgba(103, 194, 58, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
}

.comparison-above {
    color: #409eff;
    background-color: rgba(64, 158, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
}

.comparison-normal {
    color: var(--el-text-color-primary);
}

.comparison-below {
    color: #e6a23c;
    background-color: rgba(230, 162, 60, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
}

.comparison-low {
    color: #f56c6c;
    background-color: rgba(245, 108, 108, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
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
</style>
