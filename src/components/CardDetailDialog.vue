<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="$emit('update:visible', $event)"
        width="90%"
        style="max-width: 1200px;"
        top="5vh"
        align-center
        destroy-on-close
    >
        <template #header>
            <div v-if="activeCard" class="card-dialog-header">
                <el-link
                    :href="`https://scryfall.com/card/${activeCard.setCode?.toLowerCase()}/${activeCard.collectorNumber}`"
                    target="_blank"
                    type="default"
                    underline="never"
                    style="margin-left: 0.75rem; font-size: 0.875rem;"
                >
                    <span class="card-dialog-name">{{ activeCard.name }}</span>
                    <el-icon class="el-icon--right"><Link /></el-icon>
                </el-link>
            </div>
        </template>

        <template v-if="activeCard">
            <el-row :gutter="20">
                <!-- Card Image Column -->
                <el-col :span="8" :xs="24" :sm="10" :md="8">
                    <div style="text-align: center;">
                        <el-image
                            :src="showFront ? activeCard.urlFront : activeCard.urlBack"
                            fit="contain"
                            :alt="showFront ? activeCard.name : (activeCard.name ?? '') + ' (back)'"
                            :class="'card-image ' + activeCard.setCode?.toLowerCase()"
                            style="width: 100%;"
                        />
                        <div v-if="activeCard.urlBack" style="margin-top: 8px;">
                            <el-button size="small" @click="showFront = !showFront">
                                {{ showFront ? 'Show Back' : 'Show Front' }}
                            </el-button>
                        </div>
                    </div>

                    <div v-if="(activeCard.games ?? []).length > 0" style="margin-top: 12px; text-align: center;">
                        <div class="tag-list flex gap-2 justify-center">
                            <el-tag
                                v-for="game in (activeCard.games ?? [])"
                                :key="game"
                                size="small"
                                type="info"
                                :color="getGameTagColor(game)"
                                disable-transitions
                            >
                                {{ game }}
                            </el-tag>
                        </div>
                    </div>

                    <div
                        v-if="activeCard.oracleText"
                        class="oracle-text"
                        v-html="renderManaSymbols(activeCard.oracleText)"
                    />
                </el-col>

                <!-- Card Details Column -->
                <el-col :span="16" :xs="24" :sm="14" :md="16">
                    <el-row :gutter="16" class="card-descriptions-grid">
                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Core" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item label="Colors">
                                    <template v-if="(activeCard.effectiveColors ?? []).length > 0">
                                        <i
                                            v-for="color in activeCard.effectiveColors"
                                            :key="color"
                                            :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                                            style="margin-right: 4px;"
                                        ></i>
                                    </template>
                                    <span v-else>&mdash;</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Mana Value">{{ activeCard.cmc ?? 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Type Line">{{ activeCard.typeLine ?? 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Layout">{{ capitalizeFirstLetter(activeCard.layout ?? '') }}</el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Print Info" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item label="Set">
                                    {{ activeCard.setCode?.toUpperCase() }}<template v-if="activeCard.setName"> &mdash; {{ activeCard.setName }}</template>
                                </el-descriptions-item>
                                <el-descriptions-item label="Set Type">{{ activeCard.setType ?? 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Release Date">{{ activeCard.releaseDate ?? 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Original Rarity">
                                    <el-tag
                                        v-if="activeCard.rarity"
                                        size="small"
                                        type="info"
                                        :color="getRarityColor(activeCard.rarity)"
                                        disable-transitions
                                    >{{ capitalizeFirstLetter(activeCard.rarity) }}</el-tag>
                                    <span v-else>N/A</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Min Rarity">
                                    <el-tag
                                        v-if="activeCard.minRarity"
                                        size="small"
                                        type="info"
                                        :color="getRarityColor(activeCard.minRarity)"
                                        disable-transitions
                                    >{{ capitalizeFirstLetter(activeCard.minRarity) }}</el-tag>
                                    <span v-else>N/A</span>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="CubeCobra Stats" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item label="Cube Count">{{ activeCard.cubeCount }}</el-descriptions-item>
                                <el-descriptions-item label="Total Count">{{ activeCard.count }}</el-descriptions-item>
                                <el-descriptions-item label="Elo">{{ activeCard.elo != null ? activeCard.elo.toFixed(0) : 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Popularity">{{ activeCard.popularity != null ? activeCard.popularity.toFixed(2) + ' %' : 'N/A' }}</el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Characteristics" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item label="Universes Beyond">
                                    <el-tag :type="activeCard.isUniversesBeyond ? 'success' : 'info'" size="small">{{ activeCard.isUniversesBeyond ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item label="Supplemental">
                                    <el-tag :type="activeCard.isSupplementalProduct ? 'success' : 'info'" size="small">{{ activeCard.isSupplementalProduct ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item label="Makes Tokens">
                                    <el-tag :type="activeCard.makesTokens ? 'success' : 'info'" size="small">{{ activeCard.makesTokens ? 'Yes' : 'No' }}</el-tag>
                                </el-descriptions-item>
                                <el-descriptions-item label="Tags">
                                    <div v-if="filteredTags(activeCard.tags ?? []).length > 0" class="tag-list flex gap-2">
                                        <el-tag
                                            v-for="tag in filteredTags(activeCard.tags ?? [])"
                                            :key="tag"
                                            size="small"
                                            type="info"
                                            :color="getTagColor(tag)"
                                            disable-transitions
                                        >{{ tag }}</el-tag>
                                    </div>
                                    <span v-else>&mdash;</span>
                                </el-descriptions-item>
                                <el-descriptions-item label="Word Count">
                                    {{ activeCard.oracleTextWordCountMinusParen ?? 'N/A' }}
                                    <span class="cell-secondary">({{ activeCard.oracleTextWordCount ?? 'N/A' }} incl. reminder)</span>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Pricing" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item label="Min Price (USD)">{{ activeCard.minPriceUsd != null ? `$${activeCard.minPriceUsd.toFixed(2)}` : 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Min Price (Tix)">{{ activeCard.minPriceTix != null ? activeCard.minPriceTix.toFixed(2) : 'N/A' }}</el-descriptions-item>
                            </el-descriptions>
                        </el-col>
                    </el-row>
                </el-col>
            </el-row>

            <!-- Cube Inclusion Lists -->
            <el-divider />

            <el-row :gutter="20">
                <el-col :span="12" :xs="24">
                    <h3>Included In ({{ activeCard.cubeCount }}):</h3>
                    <template v-for="cube in expandedCubeList" :key="cube.key">
                        <div v-if="cube.included">
                            <el-row direction="horizontal">
                                <el-col :span="16">
                                    <el-tooltip :content="`Owner: ${cube.owner}`" placement="top" :hide-after="50">
                                        <el-link @click="openCubeDetailDialog(cube.id)">{{ cube.name }}</el-link>
                                    </el-tooltip>
                                </el-col>
                                <el-col :span="8">
                                    <el-text tag="i">({{ cube.size }} Cards)</el-text>
                                </el-col>
                            </el-row>
                        </div>
                    </template>
                </el-col>

                <el-col :span="12" :xs="24">
                    <h3>Not Included In ({{ expandedCubeList.length - activeCard.cubeCount }}):</h3>
                    <template v-for="cube in expandedCubeList" :key="cube.key">
                        <div v-if="!cube.included">
                            <el-row direction="horizontal">
                                <el-col :span="16">
                                    <el-tooltip :content="`Owner: ${cube.owner}`" placement="top" :hide-after="50">
                                        <el-link @click="openCubeDetailDialog(cube.id)">{{ cube.name }}</el-link>
                                    </el-tooltip>
                                </el-col>
                                <el-col :span="8">
                                    <el-text tag="i">({{ cube.size }} Cards)</el-text>
                                </el-col>
                            </el-row>
                        </div>
                    </template>
                </el-col>
            </el-row>
        </template>

        <template #footer>
            <el-button @click="$emit('update:visible', false)">Close</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { Link } from '@element-plus/icons-vue';
import { capitalizeFirstLetter, getRarityColor } from '../util/HelperFunctions';
import { renderManaSymbols } from '../util/ManaSymbols';
import type { Cube } from '../types';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    oracleId: {
        type: String as () => string | null,
        default: null,
    },
    loadedCubes: {
        type: Object as () => Record<string, Cube>,
        required: true,
    },
    overviewTableData: {
        type: Array as () => Cube[],
        required: true,
    },
});

defineEmits(['update:visible']);

const openCubeDetailDialog = inject<(cubeId: string) => void>('openCubeDetailDialog', () => {});

const showFront = ref(true);

const activeCard = computed(() => {
    if (!props.oracleId) return null;

    let cardData: any = null;
    const cubeKeys: string[] = [];
    let totalCount = 0;

    for (const [key, cube] of Object.entries(props.loadedCubes)) {
        for (const card of cube.cards) {
            if (card.oracleId === props.oracleId) {
                if (!cardData) cardData = card;
                if (!cubeKeys.includes(key)) {
                    cubeKeys.push(key);
                }
                totalCount++;
            }
        }
    }

    if (!cardData) return null;

    return {
        ...cardData,
        effectiveColors: (cardData.colorIdentity?.length === 0) ? ['C'] : (cardData.colorIdentity ?? []),
        cubes: cubeKeys,
        cubeCount: cubeKeys.length,
        count: totalCount,
    };
});

watch(activeCard, () => {
    showFront.value = true;
});

const expandedCubeList = computed(() => {
    if (!activeCard.value) return [];
    return Object.entries(props.loadedCubes).map(([key, cube]) => ({
        id: cube.id,
        key,
        name: cube.name,
        owner: cube.owner,
        size: cube.cards.length,
        included: activeCard.value!.cubes.includes(key),
    })).sort((a, b) => a.name.localeCompare(b.name));
});

const tagsMeta = [
    { value: 'counterspell', color: 'rgba(20, 155, 226, 0.3)' },
    { value: 'draw', color: 'rgba(30, 144, 255, 0.3)' },
    { value: 'flicker', color: 'rgba(255, 140, 0, 0.3)' },
    { value: 'ramp', color: 'rgba(60, 179, 113, 0.3)' },
    { value: 'removal', color: 'rgba(255, 99, 71, 0.3)' },
    { value: 'token', color: 'rgba(255, 215, 0, 0.3)' },
    { value: 'tutor', color: 'rgba(153, 102, 255, 0.3)' },
];

const gamesMeta = [
    { value: 'paper', color: 'rgba(34, 139, 34, 0.3)' },
    { value: 'mtgo', color: 'rgba(70, 130, 180, 0.3)' },
    { value: 'arena', color: 'rgba(218, 112, 214, 0.3)' },
];

const filteredTags = (cardTags: string[]) => {
    return cardTags.filter(tag => tagsMeta.some(t => t.value.toLowerCase() === tag.toLowerCase()));
};

const getTagColor = (tag: string) => {
    return tagsMeta.find(t => t.value.toLowerCase() === tag.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};

const getGameTagColor = (game: string) => {
    return gamesMeta.find(g => g.value.toLowerCase() === game.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};
</script>

<style scoped>
.card-dialog-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.card-dialog-name {
    font-size: 1.25rem;
    font-weight: 600;
}

.card-descriptions-grid .el-col {
    padding-bottom: 16px;
}

.oracle-text {
    margin-top: 16px;
    font-size: 0.875rem;
    line-height: 1.6;
    white-space: pre-line;
    color: var(--el-text-color-primary);
}

.oracle-text .ms {
    font-size: 1em;
    vertical-align: middle;
}
</style>
