<template>
    <div class="cube-list-container">
        <div class="cube-list-filter">
            <CardSearchInput
                class="card-table-search"
                v-model="activeQuery"
                :loaded-cubes="{}"
                :collapse-cube-filter="true"
            />
            <el-button-group>
                <el-button :icon="BrushFilled" :type="filterMode === 'dim' ? 'primary' : ''" @click="filterMode = 'dim'" title="Highlight matched cards" />
                <el-button :icon="Hide" :type="filterMode === 'hide' ? 'primary' : ''" @click="filterMode = 'hide'" title="Hide unmatched cards" />
            </el-button-group>
            <el-button-group>
                <el-button :icon="Grid" :type="visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = true" title="Visual Display" />
                <el-button :icon="List" :type="!visualDisplayVisible ? 'primary' : ''" @click="visualDisplayVisible = false" title="List Display" />
            </el-button-group>
        </div>
        <div class="cube-list-filter-status">
            <div class="cube-list-match-count">
                <el-text size="small" type="info">Filtered to {{ matchingOracleIds ? `${matchingCardCount} / ${props.cards.length}` : props.cards.length }} cards</el-text>
            </div>
        </div>
        <div v-if="visualDisplayVisible" class="cube-list-image-grid">
            <div
                v-for="card in flatCards"
                :key="card.oracleId"
                class="cube-list-image-item"
                :class="{ 'cube-list-image-item--dimmed': filterMode === 'dim' && matchingOracleIds && !matchingOracleIds.has(card.oracleId) }"
                @click="openCardDetailDialog?.(card.oracleId)"
            >
                <el-image
                    :src="card.urlFront"
                    fit="contain"
                    :alt="card.name"
                    :class="['card-image', card.setCode?.toLowerCase()]"
                    style="width: 100%; aspect-ratio: 745 / 1040;"
                    loading="lazy"
                />
            </div>
        </div>
        <div v-else class="cube-list-wrapper">
            <div ref="topScrollbarRef" class="cube-list-top-scrollbar" @scroll="onTopScroll">
                <div :style="{ width: scrollContentWidth + 'px', height: '1px' }"></div>
            </div>
            <div ref="listViewRef" class="cube-list-view" @scroll="onListScroll">
                <div
                    v-for="col in columns"
                    :key="col.id"
                    class="cube-list-column"
                    :style="{ background: col.bodyBg }"
                >
                    <div class="column-header" :style="{ background: col.headerBg }">
                        <span class="column-label">{{ col.label }}</span>
                        <span class="column-count">{{ col.matchCount !== null ? `${col.matchCount} / ` : '' }}{{ col.totalCount }}</span>
                    </div>
                    <div class="column-body">
                        <div v-for="group in col.groups" :key="group.label" class="type-section">
                            <div class="type-header">
                                {{ group.label }}
                                <span class="type-count">({{ group.cards.length }})</span>
                            </div>
                            <div
                                v-for="(card, i) in group.cards"
                                :key="`${card.oracleId}-${i}`"
                                class="card-entry"
                                :class="{
                                    'cmc-break': i > 0 && card.cmc !== group.cards[i - 1].cmc,
                                    'card-entry--dimmed': filterMode === 'dim' && matchingOracleIds && !matchingOracleIds.has(card.oracleId),
                                }"
                            >
                                <el-tooltip
                                    effect="light"
                                    placement="right"
                                    popper-class="card-tooltip"
                                    :show-after="50"
                                    :hide-after="50"
                                    :enterable="false"
                                    :offset="16"
                                >
                                    <template #content>
                                        <el-image :src="card.urlFront" fit="contain" class="card-image" />
                                    </template>
                                    <el-link
                                        @click="openCardDetailDialog?.(card.oracleId)"
                                        underline="never"
                                        class="card-name"
                                    >{{ card.isCustomCard ? '* ' : '' }}{{ card.name }}</el-link>
                                </el-tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import type { CubeCard } from '../types';
import CardSearchInput from './filters/CardSearchInput.vue';
import { parseQuery } from '../util/CardFilterParser';
import { evaluateCard, type FilterContext } from '../util/CardFilterEvaluator';
import { bindStorage } from '../util/VueLocalStorage';
import { Hide, BrushFilled, Grid, List } from '@element-plus/icons-vue';
import {
    PRIMARY_TYPE_ORDER,
    COLOR_COMBO_NAMES,
    COLOR_COMBO_ORDER,
    COLOR_COLUMN_DEFS,
    colorComboLabel,
    colorComboSortKey,
    getColorColumnId,
    sortCards
} from '../util/CardGrouping';

const props = defineProps({
    cards: {
        type: Array as () => CubeCard[],
        required: true,
    },
});

const openCardDetailDialog = inject<(oracleId: string) => void>('openCardDetailDialog');

const activeQuery = ref('');

const visualDisplayVisible = bindStorage('cube-list-display-mode-visual', (v) => typeof v === 'boolean' ? v : false);

const filterMode = bindStorage('cube-list-filter-mode', (v) => {
    return v === 'dim' ? 'dim' : 'hide';
});

const matchingOracleIds = computed<Set<string> | null>(() => {
    const { ast } = parseQuery(activeQuery.value);
    if (!ast) return null;
    const ctx: FilterContext = { loadedCubes: {} };
    const ids = new Set<string>();
    for (const card of props.cards) {
        const row = { ...card, effectiveColors: card.colors, effectiveColorIdentity: card.colorIdentity };
        if (evaluateCard(ast, row, ctx)) ids.add(card.oracleId);
    }
    return ids;
});

const matchingCardCount = computed(() => {
    if (!matchingOracleIds.value) return 0;
    return props.cards.filter(c => matchingOracleIds.value!.has(c.oracleId)).length;
});

const columns = computed(() => {
    // Total cards per column (unfiltered)
    const totalCounts: Record<string, number> = {};
    for (const def of COLOR_COLUMN_DEFS) {
        totalCounts[def.id] = 0;
    }
    for (const card of props.cards) {
        const colId = getColorColumnId(card);
        totalCounts[colId] = (totalCounts[colId] ?? 0) + 1;
    }

    // Match counts per column
    const matchCounts: Record<string, number> = {};
    if (matchingOracleIds.value) {
        for (const def of COLOR_COLUMN_DEFS) {
            matchCounts[def.id] = 0;
        }
        for (const card of props.cards) {
            if (matchingOracleIds.value.has(card.oracleId)) {
                const colId = getColorColumnId(card);
                matchCounts[colId] = (matchCounts[colId] ?? 0) + 1;
            }
        }
    }

    const buckets: Record<string, CubeCard[]> = {};
    for (const def of COLOR_COLUMN_DEFS) {
        buckets[def.id] = [];
    }

    const cardsToShow = (filterMode.value === 'hide' && matchingOracleIds.value)
        ? props.cards.filter(c => matchingOracleIds.value!.has(c.oracleId))
        : props.cards;

    for (const card of cardsToShow) {
        const colId = getColorColumnId(card);
        (buckets[colId] ?? buckets['C']).push(card);
    }

    return COLOR_COLUMN_DEFS
        .filter(def => buckets[def.id].length > 0)
        .map(def => {
            const cards = [...buckets[def.id]];

            let groups: { label: string; cards: CubeCard[] }[];

            if (def.id === 'M') {
                // Group multicolored cards by their color identity pairing (guild/shard/etc.)
                const guildBuckets: Record<string, CubeCard[]> = {};
                for (const card of cards) {
                    const label = colorComboLabel(card.colorIdentity ?? []);
                    if (!guildBuckets[label]) guildBuckets[label] = [];
                    guildBuckets[label].push(card);
                }
                groups = Object.keys(guildBuckets)
                    .sort((a, b) => {
                        // Re-derive key for sort order lookup
                        const aKey = Object.entries(COLOR_COMBO_NAMES).find(([, v]) => v === a)?.[0] ?? '';
                        const bKey = Object.entries(COLOR_COMBO_NAMES).find(([, v]) => v === b)?.[0] ?? '';
                        const ai = COLOR_COMBO_ORDER.indexOf(aKey);
                        const bi = COLOR_COMBO_ORDER.indexOf(bKey);
                        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                    })
                    .map(label => ({ label, cards: guildBuckets[label].sort(sortCards) }));
            } else if (def.id === 'L') {
                // Group lands by color identity pairing
                const identityBuckets: Record<string, CubeCard[]> = {};
                for (const card of cards) {
                    const label = colorComboLabel(card.colorIdentity ?? []);
                    if (!identityBuckets[label]) identityBuckets[label] = [];
                    identityBuckets[label].push(card);
                }
                groups = Object.entries(identityBuckets)
                    .sort(([, a], [, b]) => colorComboSortKey(a[0]?.colorIdentity ?? []) - colorComboSortKey(b[0]?.colorIdentity ?? []))
                    .map(([label, groupCards]) => ({ label, cards: groupCards.sort(sortCards) }));
            } else {
                // Group by primaryType with ranked ordering
                const typeGroups: Record<string, CubeCard[]> = {};
                for (const card of cards) {
                    const type = card.primaryType ?? 'Unknown';
                    if (!typeGroups[type]) typeGroups[type] = [];
                    typeGroups[type].push(card);
                }
                for (const group of Object.values(typeGroups)) {
                    group.sort(sortCards);
                }
                groups = [
                    ...PRIMARY_TYPE_ORDER
                        .filter(t => typeGroups[t])
                        .map(t => ({ label: t, cards: typeGroups[t] })),
                    ...Object.keys(typeGroups)
                        .filter(t => !PRIMARY_TYPE_ORDER.includes(t))
                        .sort()
                        .map(t => ({ label: t, cards: typeGroups[t] })),
                ];
            }

            return {
                ...def,
                cards,
                groups,
                totalCount: totalCounts[def.id],
                matchCount: matchingOracleIds.value ? matchCounts[def.id] : null,
            };
        });
});

const flatCards = computed(() => {
    return columns.value.flatMap(col => col.groups.flatMap(group => group.cards));
});

// --- Top scrollbar sync ---
const topScrollbarRef = ref<HTMLElement | null>(null);
const listViewRef = ref<HTMLElement | null>(null);
const scrollContentWidth = ref(0);
let syncing = false;

const updateScrollWidth = () => {
    if (listViewRef.value) {
        scrollContentWidth.value = listViewRef.value.scrollWidth;
    }
};

const onListScroll = () => {
    if (syncing) return;
    syncing = true;
    if (topScrollbarRef.value && listViewRef.value) {
        topScrollbarRef.value.scrollLeft = listViewRef.value.scrollLeft;
    }
    syncing = false;
};

const onTopScroll = () => {
    if (syncing) return;
    syncing = true;
    if (listViewRef.value && topScrollbarRef.value) {
        listViewRef.value.scrollLeft = topScrollbarRef.value.scrollLeft;
    }
    syncing = false;
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    nextTick(updateScrollWidth);
    if (listViewRef.value) {
        resizeObserver = new ResizeObserver(updateScrollWidth);
        resizeObserver.observe(listViewRef.value);
    }
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
});

watch(columns, () => nextTick(updateScrollWidth));
</script>

<style scoped>
.cube-list-filter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.card-table-search {
    flex: 1;
    min-width: 0;
}

.cube-list-match-count {
    flex-shrink: 0;
    white-space: nowrap;
}

.cube-list-filter-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
}

.cube-list-wrapper {
    position: relative;
}

.cube-list-top-scrollbar,
.cube-list-view {
    &::-webkit-scrollbar {
        height: 12px;
    }

    &::-webkit-scrollbar-track {
        background: var(--el-fill-color-light);
        border-radius: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--el-text-color-placeholder);
        border-radius: 6px;
        border: 2px solid var(--el-fill-color-light);
    }

    &::-webkit-scrollbar-thumb:hover {
        background: var(--el-text-color-secondary);
    }
}

.cube-list-top-scrollbar {
    overflow-x: scroll;
    overflow-y: hidden;
    margin-bottom: 8px;
}

.cube-list-view {
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow-x: scroll;
    align-items: flex-start;
    padding-bottom: 8px;
    min-height: 200px;
}

.cube-list-column {
    min-width: 220px; /* 160px */
    max-width: 220px;
    flex: 0 0 auto;
    border-radius: 6px;
    overflow: hidden;
}

.column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 10px;
    font-weight: 600;
    font-size: 13px;
}

.column-count {
    font-size: 11px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
}

.column-body {
    padding: 0 8px 8px;
}

.type-section {
    margin-top: 8px;
}

.type-header {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
    padding: 3px 4px;
    margin-bottom: 2px;
    font-size: 12px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.type-count {
    color: var(--el-text-color-placeholder);
    font-weight: 400;
}

.card-entry {
    display: block;
    padding: 1px 0;
}

.cmc-break {
    padding-top: 2px;
    margin-top: 0;
    border-top: 1px solid var(--el-border-color);
}

.card-entry--dimmed {
    opacity: 0.3;
}

.cube-list-image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;

    @media (max-width: 760px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
}

.cube-list-image-item {
    cursor: pointer;

    &:hover .card-image {
        opacity: 0.85;
    }
}

.cube-list-image-item--dimmed {
    opacity: 0.4;
}

.card-name {
    font-size: 14px;
    line-height: 1.65;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: fit-content;
    max-width: 100%;
    justify-content: flex-start;
    cursor: pointer;
    color: var(--el-text-color-regular);

    &:hover {
        color: var(--el-color-primary);
    }
}
</style>
