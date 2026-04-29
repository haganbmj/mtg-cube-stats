<template>
    <div class="cube-list-view">
        <div
            v-for="col in columns"
            :key="col.id"
            class="cube-list-column"
            :style="{ background: col.bodyBg }"
        >
            <div class="column-header" :style="{ background: col.headerBg }">
                <span class="column-label">{{ col.label }}</span>
                <span class="column-count">{{ col.cards.length }}</span>
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
                        :class="{ 'cmc-break': i > 0 && card.cmc !== group.cards[i - 1].cmc }"
                    >
                        <el-tooltip
                            effect="light"
                            placement="right"
                            :show-after="150"
                            :hide-after="50"
                            :offset="8"
                        >
                            <template #content>
                                <el-image :src="card.urlFront" fit="contain" style="width: 200px; border-radius: 4.75% / 3.5%;" />
                            </template>
                            <el-link
                                @click="openCardDetailDialog?.(card.oracleId)"
                                underline="never"
                                class="card-name"
                            >{{ card.name }}</el-link>
                        </el-tooltip>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import type { CubeCard } from '../types';

const PRIMARY_TYPE_ORDER = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Battle', 'Conspiracy', 'Land'];

const WUBRG = ['W', 'U', 'B', 'R', 'G'];

// Canonical color combination names (key = colors sorted in WUBRG order)
const COLOR_COMBO_NAMES: Record<string, string> = {
    '':      'Colorless',
    'W':     'White',
    'U':     'Blue',
    'B':     'Black',
    'R':     'Red',
    'G':     'Green',
    // Ally pairs
    'WU':    'Azorius',  'UB': 'Dimir',    'BR': 'Rakdos',  'RG': 'Gruul',   'WG': 'Selesnya',
    // Enemy pairs
    'WB':    'Orzhov',   'UR': 'Izzet',    'BG': 'Golgari', 'WR': 'Boros',   'UG': 'Simic',
    // Shards of Alara
    'WUG':   'Bant',     'WUB': 'Esper',   'UBR': 'Grixis', 'BRG': 'Jund',   'WRG': 'Naya',
    // Khans of Tarkir
    'WBG':   'Abzan',    'UBG': 'Sultai',  'URG': 'Temur',  'WUR': 'Jeskai', 'WBR': 'Mardu',
    // Four-color
    'WUBR':  'Artifice', 'UBRG': 'Chaos',  'WBRG': 'Aggression', 'WURG': 'Altruism', 'WUBG': 'Growth',
    // Five-color
    'WUBRG': 'Five Color',
};

// Ordering for color combo groups within M and L columns
const COLOR_COMBO_ORDER = [
    '',
    'W', 'U', 'B', 'R', 'G',
    // Ally pairs
    'WU', 'UB', 'BR', 'RG', 'WG',
    // Enemy pairs
    'WB', 'UR', 'BG', 'WR', 'UG',
    // Shards of Alara
    'WUG', 'WUB', 'UBR', 'BRG', 'WRG',
    // Khans of Tarkir
    'WBG', 'UBG', 'URG', 'WUR', 'WBR',
    // Four-color
    'WUBR', 'UBRG', 'WBRG', 'WURG', 'WUBG',
    // Five-color
    'WUBRG',
];

function sortedColorKey(colors: string[]): string {
    return [...colors]
        .filter(c => WUBRG.includes(c))
        .sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b))
        .join('');
}

function colorComboLabel(colors: string[]): string {
    const key = sortedColorKey(colors);
    return COLOR_COMBO_NAMES[key] ?? (key || 'Colorless');
}

function colorComboSortKey(colors: string[]): number {
    const key = sortedColorKey(colors);
    const idx = COLOR_COMBO_ORDER.indexOf(key);
    return idx === -1 ? COLOR_COMBO_ORDER.length : idx;
}

const COLOR_COLUMN_DEFS = [
    { id: 'W', label: 'White',        bodyBg: 'rgba(255, 248, 220, 0.05)', headerBg: 'rgba(255, 248, 220, 0.12)' },
    { id: 'U', label: 'Blue',         bodyBg: 'rgba(30,  100, 200, 0.08)', headerBg: 'rgba(30,  100, 200, 0.18)' },
    { id: 'B', label: 'Black',        bodyBg: 'rgba(100,  80, 130, 0.10)', headerBg: 'rgba(100,  80, 130, 0.22)' },
    { id: 'R', label: 'Red',          bodyBg: 'rgba(200,  50,  30, 0.08)', headerBg: 'rgba(200,  50,  30, 0.18)' },
    { id: 'G', label: 'Green',        bodyBg: 'rgba(30,  140,  60, 0.08)', headerBg: 'rgba(30,  140,  60, 0.18)' },
    { id: 'M', label: 'Multicolored', bodyBg: 'rgba(210, 160,  20, 0.08)', headerBg: 'rgba(210, 160,  20, 0.18)' },
    { id: 'C', label: 'Colorless',    bodyBg: 'rgba(160, 150, 140, 0.08)', headerBg: 'rgba(160, 150, 140, 0.18)' },
    { id: 'L', label: 'Lands',        bodyBg: 'rgba(110,  75,  40, 0.10)', headerBg: 'rgba(110,  75,  40, 0.22)' },
] as const;

const props = defineProps({
    cards: {
        type: Array as () => CubeCard[],
        required: true,
    },
});

const openCardDetailDialog = inject<(oracleId: string) => void>('openCardDetailDialog');

function getColorColumnId(card: CubeCard): string {
    if (card.primaryType === 'Land') return 'L';
    const colors = card.colors ?? [];
    if (colors.length > 1) return 'M';
    if (colors.length === 0) return 'C';
    return colors[0];
}

function sortCards(a: CubeCard, b: CubeCard): number {
    const cmcDiff = (a.cmc ?? 0) - (b.cmc ?? 0);
    if (cmcDiff !== 0) return cmcDiff;
    return (a.name ?? '').localeCompare(b.name ?? '');
}

const columns = computed(() => {
    const buckets: Record<string, CubeCard[]> = {};
    for (const def of COLOR_COLUMN_DEFS) {
        buckets[def.id] = [];
    }

    for (const card of props.cards) {
        const colId = getColorColumnId(card);
        (buckets[colId] ?? buckets['C']).push(card);
    }

    return COLOR_COLUMN_DEFS
        .filter(def => buckets[def.id].length > 0)
        .map(def => {
            const cards = [...buckets[def.id]];

            let groups: { label: string; cards: CubeCard[] }[];

            if (def.id === 'M') {
                // Group multicolored cards by their color pairing (guild/shard/etc.)
                const guildBuckets: Record<string, CubeCard[]> = {};
                for (const card of cards) {
                    const label = colorComboLabel(card.colors ?? []);
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

            return { ...def, cards, groups };
        });
});
</script>

<style scoped>
.cube-list-view {
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
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
    padding-top: 0;
    margin-top: 0;
    border-top: 1px solid var(--el-border-color-extra-light);
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
