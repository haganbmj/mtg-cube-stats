<template>
    <el-card class="archetype-analysis-card">
        <template #header>
            <div class="card-header">
                <h3>Supported Themes/Archetypes</h3>
                <!-- <el-text tag="small" type="info">
                    Detected themes and strategies based on {{ totalCards }} cards
                </el-text> -->
            </div>
        </template>

        <div v-if="archetypes.length === 0" class="no-archetypes">
            <el-empty description="No significant archetype support detected">
                <el-text type="info">
                    This cube may focus on good stuff or have very low archetype density.
                </el-text>
            </el-empty>
        </div>

        <div v-else>
            <!-- Summary stats -->
            <!-- <el-row :gutter="16" class="archetype-summary">
                <el-col :span="6" :xs="12">
                    <el-statistic
                        title="Supported Themes"
                        :value="supportedArchetypes.length"
                        suffix="themes"
                    />
                </el-col>
                <el-col :span="6" :xs="12">
                    <el-statistic
                        title="Average Support"
                        :value="averageSupport"
                        :precision="1"
                        suffix="cards"
                    />
                </el-col>
                <el-col :span="6" :xs="12">
                    <el-statistic
                        title="Strongest Theme"
                        :value="strongestArchetype?.name || 'None'"
                    />
                </el-col>
                <el-col :span="6" :xs="12">
                    <el-statistic
                        title="Archetype Density"
                        :value="archetypeDensity"
                        :precision="1"
                        suffix="%"
                    />
                </el-col>
            </el-row>

            <el-divider /> -->

            <!-- Archetype table -->
            <el-table
                :data="displayedArchetypes"
                style="width: 100%"
                :default-sort="{ prop: 'count', order: 'descending' }"
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

                <el-table-column prop="count" label="Cards" width="80" align="center" sortable />

                <el-table-column prop="percentage" label="%" width="70" align="center" sortable />

                <el-table-column type="expand">
                    <template #default="{ row }">
                        <div class="archetype-details">
                            <el-row>
                                <el-col :span="24">
                                    <h4>Supporting Cards ({{ row.cards.length }}):</h4>
                                    <div class="supporting-cards">
                                        <el-tooltip
                                            v-for="cardName in row.cards.slice(0, showAllCards[row.name] ? row.cards.length : 12)"
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
                                                        :class="'card-image ' + (getCardByName(cardName)?.setCode?.toLowerCase() || '')"
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
                                            v-if="row.cards.length > 12 && !showAllCards[row.name]"
                                            link
                                            type="primary"
                                            size="small"
                                            @click="showAllCards[row.name] = true"
                                        >
                                            Show {{ row.cards.length - 12 }} more...
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
                                </el-col>
                            </el-row>
                        </div>
                    </template>
                </el-table-column>
            </el-table>

            <!-- View options -->
            <!-- <div class="view-options" style="margin-top: 16px;">
                <el-checkbox v-model="showOnlySupported">
                    Show only viable archetypes ({{ supportedArchetypes.length }})
                </el-checkbox>
            </div> -->
        </div>
    </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { detectCubeArchetypes } from '../util/ArchetypeDetection';

// Function to get card object by name from cube cards
const getCardByName = (cardName: string) => {
    return props.cubeCards.find(card => card.name === cardName);
};

// Function to get card image URL from card model
const getCardImageUrl = (cardName: string) => {
    const card = getCardByName(cardName);
    return card?.urlFront || '';
};

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

const props = defineProps({
    cubeCards: {
        type: Array,
        required: true,
    },
});

const showOnlySupported = ref(false);
const showAllCards = ref({});

// Detect archetypes from cube cards
const archetypes = computed(() => {
    return detectCubeArchetypes(props.cubeCards);
});

const supportedArchetypes = computed(() => {
    return archetypes.value.filter(archetype => archetype.supported);
});

const displayedArchetypes = computed(() => {
    return showOnlySupported.value ? supportedArchetypes.value : archetypes.value;
});

const totalCards = computed(() => {
    return props.cubeCards.length;
});

const averageSupport = computed(() => {
    if (supportedArchetypes.value.length === 0) return 0;
    const total = supportedArchetypes.value.reduce((sum, arch) => sum + arch.count, 0);
    return total / supportedArchetypes.value.length;
});

const strongestArchetype = computed(() => {
    return supportedArchetypes.value[0] || null;
});

const archetypeDensity = computed(() => {
    if (archetypes.value.length === 0) return 0;
    const totalArchetypeCards = archetypes.value.reduce((sum, arch) => sum + arch.count, 0);
    // Note: cards can support multiple archetypes, so this can exceed 100%
    return (totalArchetypeCards / totalCards.value) * 100;
});
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

.archetype-summary {
    margin-bottom: 24px;
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
    gap: 8px;
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

.view-options {
    display: flex;
    justify-content: flex-end;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-light);
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

@media (max-width: 768px) {
    .archetype-summary .el-col {
        margin-bottom: 16px;
    }

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
