<template>
    <el-dialog
        :model-value="visible"
        :modal="modal"
        width="90%"
        style="max-width: 1200px;"
        top="5vh"
        align-center
        :before-close="() => $emit('close')"
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
                            style="width: 100%; aspect-ratio: 63 / 88;"
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
                                :class="{ 'custom-color-tag': getGameTagColor(game) }"
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
                                <el-descriptions-item v-if="activeCard.power != null" label="P / T">{{ activeCard.power }} / {{ activeCard.toughness }}</el-descriptions-item>
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
                                        :class="{ 'custom-color-tag': getRarityColor(activeCard.rarity) }"
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
                                        :class="{ 'custom-color-tag': getRarityColor(activeCard.minRarity) }"
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
                                <el-descriptions-item label="Word Count">
                                    {{ activeCard.oracleTextWordCountMinusParen ?? 'N/A' }}
                                    <span class="cell-secondary">({{ activeCard.oracleTextWordCount ?? 'N/A' }} incl. reminder)</span>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col v-if="frequencyDataReady" :span="12" :xs="24">
                            <el-descriptions title="Global Inclusion Rate" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item v-for="cat in globalRateCategories" :key="cat.value" :label="cat.label">
                                    <template v-if="cat.cardCount != null && cat.cubeCount">
                                        <span>{{ ((cat.cardCount / cat.cubeCount) * 100).toFixed(1) }}%</span>
                                        <span class="cell-secondary"> ({{ cat.cardCount.toLocaleString() }} / {{ cat.cubeCount.toLocaleString() }})</span>
                                    </template>
                                    <span v-else>N/A</span>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col :span="12" :xs="24">
                            <el-descriptions title="Pricing" :column="1" :label-width="150" :border="true" size="default">
                                <el-descriptions-item label="Min Price (USD)">{{ activeCard.minPriceUsd != null ? `$${formatPrice(activeCard.minPriceUsd)}` : 'N/A' }}</el-descriptions-item>
                                <el-descriptions-item label="Min Price (Tix)">{{ activeCard.minPriceTix != null ? formatPrice(activeCard.minPriceTix) : 'N/A' }}</el-descriptions-item>
                            </el-descriptions>
                        </el-col>

                        <el-col v-if="(activeCard.tags ?? []).length > 0" :span="24">
                            <el-descriptions title="Tags" :border="false" size="default">
                                <el-descriptions-item :span="3">
                                    <div class="tag-list flex gap-2">
                                        <el-tag
                                            v-for="tag in (activeCard.tags ?? [])"
                                            :key="tag"
                                            size="small"
                                            type="info"
                                            :class="{ 'custom-color-tag': getTagColor(tag) }"
                                            :color="getTagColor(tag)"
                                            disable-transitions
                                            style="cursor: pointer;"
                                            @click="appendTagFilter(tag)"
                                        >{{ tag }}</el-tag>
                                    </div>
                                </el-descriptions-item>
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
                                    <el-tooltip :content="`Owner: ${cube.owner}`" :enterable="false" placement="top" :hide-after="50">
                                        <el-link :href="`https://cubecobra.com/cube/about/${externalCubeId(cube)}`" target="_blank" @click.prevent="openCubeDetailDialog(cube.id)">{{ displayName(cube) }}</el-link>
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
                                    <el-tooltip :content="`Owner: ${cube.owner}`" :enterable="false" placement="top" :hide-after="50">
                                        <el-link :href="`https://cubecobra.com/cube/about/${externalCubeId(cube)}`" target="_blank" @click.prevent="openCubeDetailDialog(cube.id)">{{ displayName(cube) }}</el-link>
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

        <template v-if="!isMobile" #footer>
            <el-button @click="$emit('close')">Close</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { Link } from '@element-plus/icons-vue';
import { capitalizeFirstLetter, getRarityColor, formatPrice, normalizeSortName, castInensitiveSort } from '../util/HelperFunctions';
import { renderManaSymbols } from '../util/ManaSymbols';
import { getScryfallCards } from '../util/CubeFunctions';
import { frequencyDataReady, resolveCardCount, resolveCubeCount } from '../util/CubeCobraFrequency';
import { getCardStats } from '../util/CubeCobraCardStats';
import { displayName, externalCubeId } from '../util/Snapshots';
import type { Cube, CubeOverviewRow } from '../types';
import { openCubeDetailDialogKey } from '../types/injectionKeys';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    modal: {
        type: Boolean,
        default: true,
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
        type: Array as () => CubeOverviewRow[],
        required: true,
    },
});

defineEmits(['close']);

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value <= 760);

const openCubeDetailDialog = inject(openCubeDetailDialogKey, () => {});

const cardTableQuery = inject<Ref<string>>('cardTableQuery');

const appendTagFilter = (tag: string) => {
    if (!cardTableQuery) return;
    const clause = `tag:${tag}`;
    const current = cardTableQuery.value.trim();
    cardTableQuery.value = current ? `${current} ${clause}` : clause;
};

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

    if (!cardData) {
        const scryfallCards = getScryfallCards();
        cardData = scryfallCards[props.oracleId] ?? null;
        if (!cardData) return null;
    }

    const fallbackStats = getCardStats(props.oracleId!);
    return {
        ...cardData,
        oracleId: props.oracleId,
        setCode: cardData.setCode?.toUpperCase() ?? '',
        effectiveColors: (cardData.colorIdentity?.length === 0) ? ['C'] : (cardData.colorIdentity ?? []),
        cubes: cubeKeys,
        cubeCount: cubeKeys.length,
        count: totalCount,
        elo: cardData.elo ?? fallbackStats?.elo,
        popularity: cardData.popularity ?? fallbackStats?.popularity,
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
    })).sort((a, b) => castInensitiveSort(normalizeSortName(a.name), normalizeSortName(b.name)));
});

const GLOBAL_RATE_CATEGORIES = [
    { label: 'All Cubes', value: 'total' },
    { label: 'Peasant', value: 'broad:peasant' },
    { label: 'Pauper', value: 'broad:pauper' },
] as const;

const globalRateCategories = computed(() => {
    if (!activeCard.value?.oracleId) return [];
    const oracleId = activeCard.value.oracleId;
    return GLOBAL_RATE_CATEGORIES.map(cat => ({
        label: cat.label,
        value: cat.value,
        cardCount: resolveCardCount(oracleId, cat.value),
        cubeCount: resolveCubeCount(cat.value),
    }));
});

const tagsMeta = [
    { value: 'counterspell', color: '#1a6e9e' },
    { value: 'draw', color: '#1c5fb8' },
    { value: 'flicker', color: '#b36b00' },
    { value: 'ramp', color: '#2e7d4f' },
    { value: 'removal', color: '#b33a2a' },
    { value: 'token', color: '#8a6d00' },
    { value: 'tutor', color: '#5c3d99' },
];

const gamesMeta = [
    { value: 'paper', color: '#1e6b1e' },
    { value: 'mtgo', color: '#3a6d8c' },
    { value: 'arena', color: '#7a3d78' },
];

const getTagColor = (tag: string) => {
    return tagsMeta.find(t => t.value.toLowerCase() === tag.toLowerCase())?.color;
};

const getGameTagColor = (game: string) => {
    return gamesMeta.find(g => g.value.toLowerCase() === game.toLowerCase())?.color;
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

:deep(.custom-color-tag) {
    color: #fff !important;
    border-color: transparent !important;
}

</style>
