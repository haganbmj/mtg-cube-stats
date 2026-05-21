<template>
    <div class="comparison-view">
        <!-- Column headers -->
        <div class="comparison-row column-headers">
            <div class="comparison-cell header-a">
                Only in {{ props.cubeA.name }} ({{ filteredOnlyA.length }} / {{ props.cubeA.cards.length }})
            </div>
            <div class="comparison-cell header-both">
                In Both Cubes ({{ filteredBoth.length }})
            </div>
            <div class="comparison-cell header-b">
                Only in {{ props.cubeB.name }} ({{ filteredOnlyB.length }} / {{ props.cubeB.cards.length }})
            </div>
        </div>

        <!-- Color sections -->
        <template v-for="colorDef in unionColors" :key="colorDef.id">
            <!-- Color header row -->
            <div class="comparison-row color-header" :style="{ background: colorDef.headerBg }">
                <div class="comparison-cell">
                    {{ colorDef.label }}
                    <span class="color-count">({{ getColumnColorCount(groupedA, colorDef.id) }} / {{ getColorTotal(props.cubeA.cards, colorDef.id) }})</span>
                </div>
                <div class="comparison-cell">
                    {{ colorDef.label }}
                    <span class="color-count">({{ getColumnColorCount(groupedBoth, colorDef.id) }})</span>
                </div>
                <div class="comparison-cell">
                    {{ colorDef.label }}
                    <span class="color-count">({{ getColumnColorCount(groupedB, colorDef.id) }} / {{ getColorTotal(props.cubeB.cards, colorDef.id) }})</span>
                </div>
            </div>

            <!-- Type group rows within this color -->
            <template v-for="typeLabel in getUnionTypeLabels(colorDef.id)" :key="`${colorDef.id}-${typeLabel}`">
                <div class="comparison-row type-row" :style="{ background: colorDef.bodyBg }">
                    <div class="comparison-cell">
                        <div
                            class="type-header"
                            :class="{ 'type-header--empty': !getGroupCards(groupedA, colorDef.id, typeLabel).length }"
                        >
                            {{ typeLabel }}
                            <span class="type-count">
                                ({{ getGroupCards(groupedA, colorDef.id, typeLabel).length }}
                                / {{ getGroupTotal(props.cubeA.cards, colorDef.id, typeLabel) }})
                            </span>
                        </div>
                        <div
                            v-for="(card, i) in getGroupCards(groupedA, colorDef.id, typeLabel)"
                            :key="`a-${card.oracleId}-${i}`"
                            class="card-entry"
                            :class="{
                                'cmc-break': i > 0 && card.cmc !== getGroupCards(groupedA, colorDef.id, typeLabel)[i - 1].cmc,
                                'card-entry--dimmed': props.filterMode === 'dim' && props.matchingOracleIds && !props.matchingOracleIds.has(card.oracleId),
                            }"
                        >
                            <el-tooltip effect="light" placement="right" popper-class="card-tooltip" :show-after="50" :hide-after="50" :offset="8">
                                <template #content>
                                    <el-image :src="card.urlFront" fit="contain" class="card-image" />
                                </template>
                                <el-link @click="openCardDetailDialog?.(card.oracleId)" underline="never" class="card-name">{{ card.name }}</el-link>
                            </el-tooltip>
                        </div>
                    </div>
                    <div class="comparison-cell">
                        <div
                            class="type-header"
                            :class="{ 'type-header--empty': !getGroupCards(groupedBoth, colorDef.id, typeLabel).length }"
                        >
                            {{ typeLabel }}
                            <span class="type-count">
                                ({{ getGroupCards(groupedBoth, colorDef.id, typeLabel).length }})
                            </span>
                        </div>
                        <div
                            v-for="(card, i) in getGroupCards(groupedBoth, colorDef.id, typeLabel)"
                            :key="`both-${card.oracleId}-${i}`"
                            class="card-entry"
                            :class="{
                                'cmc-break': i > 0 && card.cmc !== getGroupCards(groupedBoth, colorDef.id, typeLabel)[i - 1].cmc,
                                'card-entry--dimmed': props.filterMode === 'dim' && props.matchingOracleIds && !props.matchingOracleIds.has(card.oracleId),
                            }"
                        >
                            <el-tooltip effect="light" placement="right" popper-class="card-tooltip" :show-after="50" :hide-after="50" :offset="8">
                                <template #content>
                                    <el-image :src="card.urlFront" fit="contain" class="card-image" />
                                </template>
                                <el-link @click="openCardDetailDialog?.(card.oracleId)" underline="never" class="card-name">{{ card.name }}</el-link>
                            </el-tooltip>
                        </div>
                    </div>
                    <div class="comparison-cell">
                        <div
                            class="type-header"
                            :class="{ 'type-header--empty': !getGroupCards(groupedB, colorDef.id, typeLabel).length }"
                        >
                            {{ typeLabel }}
                            <span class="type-count">
                                ({{ getGroupCards(groupedB, colorDef.id, typeLabel).length }}
                                / {{ getGroupTotal(props.cubeB.cards, colorDef.id, typeLabel) }})
                            </span>
                        </div>
                        <div
                            v-for="(card, i) in getGroupCards(groupedB, colorDef.id, typeLabel)"
                            :key="`b-${card.oracleId}-${i}`"
                            class="card-entry"
                            :class="{
                                'cmc-break': i > 0 && card.cmc !== getGroupCards(groupedB, colorDef.id, typeLabel)[i - 1].cmc,
                                'card-entry--dimmed': props.filterMode === 'dim' && props.matchingOracleIds && !props.matchingOracleIds.has(card.oracleId),
                            }"
                        >
                            <el-tooltip effect="light" placement="right" popper-class="card-tooltip" :show-after="50" :hide-after="50" :offset="8">
                                <template #content>
                                    <el-image :src="card.urlFront" fit="contain" class="card-image" />
                                </template>
                                <el-link @click="openCardDetailDialog?.(card.oracleId)" underline="never" class="card-name">{{ card.name }}</el-link>
                            </el-tooltip>
                        </div>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Cube, CubeCard } from '../types';
import {
    COLOR_COLUMN_DEFS,
    groupCardsByColorAndType,
    getColorColumnId,
    colorComboLabel,
    type ColorColumn
} from '../util/CardGrouping';

const props = defineProps({
    onlyA: {
        type: Array as () => CubeCard[],
        required: true,
    },
    both: {
        type: Array as () => CubeCard[],
        required: true,
    },
    onlyB: {
        type: Array as () => CubeCard[],
        required: true,
    },
    cubeA: {
        type: Object as () => Cube,
        required: true,
    },
    cubeB: {
        type: Object as () => Cube,
        required: true,
    },
    matchingOracleIds: {
        type: Object as () => Set<string> | null,
        default: null,
    },
    filterMode: {
        type: String as () => 'dim' | 'hide',
        default: 'dim',
    },
});

const openCardDetailDialog = inject<(oracleId: string) => void>('openCardDetailDialog');

// Apply hide filter
const filteredOnlyA = computed(() => {
    if (props.filterMode === 'hide' && props.matchingOracleIds) {
        return props.onlyA.filter(c => props.matchingOracleIds!.has(c.oracleId));
    }
    return props.onlyA;
});

const filteredBoth = computed(() => {
    if (props.filterMode === 'hide' && props.matchingOracleIds) {
        return props.both.filter(c => props.matchingOracleIds!.has(c.oracleId));
    }
    return props.both;
});

const filteredOnlyB = computed(() => {
    if (props.filterMode === 'hide' && props.matchingOracleIds) {
        return props.onlyB.filter(c => props.matchingOracleIds!.has(c.oracleId));
    }
    return props.onlyB;
});

// Group each column
const groupedA = computed(() => groupCardsByColorAndType(filteredOnlyA.value));
const groupedBoth = computed(() => groupCardsByColorAndType(filteredBoth.value));
const groupedB = computed(() => groupCardsByColorAndType(filteredOnlyB.value));

// Union of color columns across all three groups
const unionColors = computed(() => {
    const presentIds = new Set<string>();
    for (const col of [...groupedA.value, ...groupedBoth.value, ...groupedB.value]) {
        presentIds.add(col.id);
    }
    return COLOR_COLUMN_DEFS.filter(def => presentIds.has(def.id));
});

// Find the ColorColumn in a grouped array by id
function findColumn(grouped: ColorColumn[], colorId: string): ColorColumn | undefined {
    return grouped.find(c => c.id === colorId);
}

// Union of type group labels for a given color across all three groups
function getUnionTypeLabels(colorId: string): string[] {
    const labels = new Map<string, number>();
    let order = 0;
    for (const grouped of [groupedA.value, groupedBoth.value, groupedB.value]) {
        const col = findColumn(grouped, colorId);
        if (!col) continue;
        for (const group of col.groups) {
            if (!labels.has(group.label)) {
                labels.set(group.label, order++);
            }
        }
    }
    return [...labels.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);
}

// Get cards for a specific color+type from a grouped array
function getGroupCards(grouped: ColorColumn[], colorId: string, typeLabel: string): CubeCard[] {
    const col = findColumn(grouped, colorId);
    if (!col) return [];
    const group = col.groups.find(g => g.label === typeLabel);
    return group?.cards ?? [];
}

// Count cards in a grouped array for a color
function getColumnColorCount(grouped: ColorColumn[], colorId: string): number {
    const col = findColumn(grouped, colorId);
    return col?.totalCount ?? 0;
}

// Count cards in full cube array matching a color column
function getColorTotal(cards: CubeCard[], colorId: string): number {
    let count = 0;
    for (const card of cards) {
        if (getColorColumnId(card) === colorId) count++;
    }
    return count;
}

// Count cards in full cube matching color+type group
function getGroupTotal(cards: CubeCard[], colorId: string, groupLabel: string): number {
    let count = 0;
    for (const card of cards) {
        if (getColorColumnId(card) !== colorId) continue;
        if (colorId === 'M') {
            if (colorComboLabel(card.colors ?? []) === groupLabel) count++;
        } else if (colorId === 'L') {
            if (colorComboLabel(card.colorIdentity ?? []) === groupLabel) count++;
        } else {
            if (card.primaryType === groupLabel) count++;
        }
    }
    return count;
}
</script>

<style scoped>
.comparison-view {
    width: 100%;
}

.comparison-row {
    display: flex;
    gap: 2px;
}

.comparison-cell {
    flex: 1;
    padding: 4px 8px;
    min-width: 0;
}

.column-headers {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 4px;
}

.header-a {
    background: rgba(210, 130, 40, 0.15);
    border-radius: 4px 0 0 4px;
}

.header-both {
    background: rgba(160, 160, 160, 0.15);
}

.header-b {
    background: rgba(60, 120, 200, 0.15);
    border-radius: 0 4px 4px 0;
}

.color-header {
    font-weight: 600;
    font-size: 13px;
    margin-top: 8px;
    border-radius: 4px;
}

.color-count {
    font-size: 11px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
}

.type-header {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
    padding: 3px 4px;
    margin-bottom: 2px;
    margin-top: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 3px;
}

.type-header--empty {
    color: var(--el-text-color-placeholder);
    background: rgba(255, 255, 255, 0.02);
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
    padding-top: 0;
    margin-top: 0;
    border-top: 1px solid var(--el-border-color-extra-light);
}

.card-entry--dimmed {
    opacity: 0.3;
}

.card-name {
    font-size: 14px;
    line-height: 1.65;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    display: block;
    cursor: pointer;
    color: var(--el-text-color-regular);

    &:hover {
        color: var(--el-color-primary);
    }
}
</style>
