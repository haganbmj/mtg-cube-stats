import type { CubeCard } from '../types';

export const PRIMARY_TYPE_ORDER = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Battle', 'Conspiracy', 'Land'];

export const WUBRG = ['W', 'U', 'B', 'R', 'G'];

// Canonical color combination names (key = colors sorted in WUBRG order)
export const COLOR_COMBO_NAMES: Record<string, string> = {
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
export const COLOR_COMBO_ORDER = [
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

export function sortedColorKey(colors: string[]): string {
    return [...colors]
        .filter(c => WUBRG.includes(c))
        .sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b))
        .join('');
}

export function colorComboLabel(colors: string[]): string {
    const key = sortedColorKey(colors);
    return COLOR_COMBO_NAMES[key] ?? (key || 'Colorless');
}

export function colorComboSortKey(colors: string[]): number {
    const key = sortedColorKey(colors);
    const idx = COLOR_COMBO_ORDER.indexOf(key);
    return idx === -1 ? COLOR_COMBO_ORDER.length : idx;
}

export const COLOR_COLUMN_DEFS = [
    { id: 'W', label: 'White',        bodyBg: 'rgba(255, 248, 220, 0.05)', headerBg: 'rgba(255, 248, 220, 0.12)' },
    { id: 'U', label: 'Blue',         bodyBg: 'rgba(30,  100, 200, 0.08)', headerBg: 'rgba(30,  100, 200, 0.18)' },
    { id: 'B', label: 'Black',        bodyBg: 'rgba(100,  80, 130, 0.10)', headerBg: 'rgba(100,  80, 130, 0.22)' },
    { id: 'R', label: 'Red',          bodyBg: 'rgba(200,  50,  30, 0.08)', headerBg: 'rgba(200,  50,  30, 0.18)' },
    { id: 'G', label: 'Green',        bodyBg: 'rgba(30,  140,  60, 0.08)', headerBg: 'rgba(30,  140,  60, 0.18)' },
    { id: 'M', label: 'Multicolored', bodyBg: 'rgba(210, 160,  20, 0.08)', headerBg: 'rgba(210, 160,  20, 0.18)' },
    { id: 'C', label: 'Colorless',    bodyBg: 'rgba(160, 150, 140, 0.08)', headerBg: 'rgba(160, 150, 140, 0.18)' },
    { id: 'L', label: 'Lands',        bodyBg: 'rgba(110,  75,  40, 0.10)', headerBg: 'rgba(110,  75,  40, 0.22)' },
] as const;

export type ColorColumnId = typeof COLOR_COLUMN_DEFS[number]['id'];

export interface CardGroup {
    label: string;
    cards: CubeCard[];
}

export interface ColorColumn {
    id: string;
    label: string;
    bodyBg: string;
    headerBg: string;
    totalCount: number;
    groups: CardGroup[];
}

export function getColorColumnId(card: CubeCard): string {
    if (card.primaryType === 'Land') return 'L';
    const colors = card.colors ?? [];
    if (colors.length > 1) return 'M';
    if (colors.length === 0) return 'C';
    return colors[0];
}

export function sortCards(a: CubeCard, b: CubeCard): number {
    const cmcDiff = (a.cmc ?? 0) - (b.cmc ?? 0);
    if (cmcDiff !== 0) return cmcDiff;
    return (a.name ?? '').localeCompare(b.name ?? '');
}

export function groupCardsByColorAndType(cards: CubeCard[]): ColorColumn[] {
    const totalCounts: Record<string, number> = {};
    for (const def of COLOR_COLUMN_DEFS) {
        totalCounts[def.id] = 0;
    }
    for (const card of cards) {
        const colId = getColorColumnId(card);
        totalCounts[colId] = (totalCounts[colId] ?? 0) + 1;
    }

    const buckets: Record<string, CubeCard[]> = {};
    for (const def of COLOR_COLUMN_DEFS) {
        buckets[def.id] = [];
    }
    for (const card of cards) {
        const colId = getColorColumnId(card);
        (buckets[colId] ?? buckets['C']).push(card);
    }

    return COLOR_COLUMN_DEFS
        .filter(def => buckets[def.id].length > 0)
        .map(def => {
            const colCards = [...buckets[def.id]];

            let groups: CardGroup[];

            if (def.id === 'M') {
                // Group multicolored cards by their color pairing (guild/shard/etc.)
                const guildBuckets: Record<string, CubeCard[]> = {};
                for (const card of colCards) {
                    const label = colorComboLabel(card.colors ?? []);
                    if (!guildBuckets[label]) guildBuckets[label] = [];
                    guildBuckets[label].push(card);
                }
                groups = Object.keys(guildBuckets)
                    .sort((a, b) => {
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
                for (const card of colCards) {
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
                for (const card of colCards) {
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
                totalCount: totalCounts[def.id],
                groups,
            };
        });
}
