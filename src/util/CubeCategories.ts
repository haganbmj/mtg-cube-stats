interface CategoryCardInput {
    oracleId: string;
    minRarity?: string;
    effectiveTypes?: string[];
}

export const cubeCategories = [
    { text: 'pauper', value: 'pauper', color: 'rgba(255, 165, 0, 0.2)', tooltip: 'All cards are commons.' },
    { text: 'pauper+', value: 'pauper+', color: 'rgba(0, 255, 115, 0.2)', tooltip: 'All non-land cards are commons.' },
    { text: 'pauper-ish', value: 'pauper-ish', color: 'rgba(95, 95, 235, 0.2)', tooltip: '≥92.5% of non-land cards are commons; no uncommon/rare lands.' },
    { text: 'pauper+ish', value: 'pauper+ish', color: 'rgba(95, 235, 95, 0.2)', tooltip: '≥92.5% of non-land cards are commons; contains uncommon/rare lands.' },
    { text: 'peasant', value: 'peasant', color: 'rgba(0, 128, 0, 0.2)', tooltip: 'All cards are common or uncommon.' },
    { text: 'peasant+', value: 'peasant+', color: 'rgba(34, 145, 169, 0.2)', tooltip: 'All non-land cards are common or uncommon.' },
    { text: 'peasant-ish', value: 'peasant-ish', color: 'rgba(128, 0, 128, 0.2)', tooltip: '≥92.5% of non-land cards are common or uncommon; no rare lands.' },
    { text: 'peasant+ish', value: 'peasant+ish', color: 'rgba(128, 128, 0, 0.2)', tooltip: '≥92.5% of non-land cards are common or uncommon; contains rare lands.' },
    { text: 'powered', value: 'powered', color: 'rgba(128, 0, 20, 0.2)', tooltip: 'Contains one or more pieces of the Power 9.' },
    { text: 'desert', value: 'desert', color: 'rgba(169, 150, 35, 0.2)', tooltip: 'Contains more than 28% lands.' },
] as const;

export const getCategoryTagColor = (category: string): string => {
    return cubeCategories.find(c => c.value.toLowerCase() === category?.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};

export const getCategoryTooltip = (category: string): string => {
    return cubeCategories.find(c => c.value.toLowerCase() === category?.toLowerCase())?.tooltip ?? '';
};

export const BROAD_GROUPS: Record<string, string[]> = {
    pauper: ['pauper', 'pauper+', 'pauper-ish', 'pauper+ish'],
    peasant: ['peasant', 'peasant+', 'peasant-ish', 'peasant+ish'],
};

const powerOracleIds = [
    '550c74d4-1fcb-406a-b02a-639a760a4380', // Ancestral Recall
    '5089ec1a-f881-4d55-af14-5d996171203b', // Black Lotus
    '376ee366-e082-402f-b4db-6592fcfcacd2', // Mox Emerald
    '0677f49e-f8bf-4349-af52-2ccde9287c2e', // Mox Jet
    '824597b8-c89a-47ec-8526-7efc6e24ef0e', // Mox Pearl
    'ed85fa82-e4fa-434b-92a8-36b6075708d1', // Mox Ruby
    'd5ed1233-df87-4b90-8918-13922ec95249', // Mox Sapphire
    'c823e687-6311-4c99-974b-fd77d204141a', // Timetwister
    'd0209d3f-3f7e-4fd5-bce5-10bce6f29c86', // Time Walk
];

export function assumedCategories(cards: CategoryCardInput[]): string[] {
    const totalCards = cards.length;
    const categories = new Set<string>();

    const mappedRarities = cards.reduce((catCounts: Record<string, Record<string, number>>, c) => {
        const isLand = c.effectiveTypes?.includes('Land') ? 'land' : 'nonLand';
        const minRarity = c.minRarity ?? 'common';

        catCounts['all'] = catCounts['all'] || {};
        catCounts['all'][minRarity] = (catCounts['all'][minRarity] || 0) + 1;
        catCounts['all']['total'] = (catCounts['all']['total'] || 0) + 1;

        catCounts[isLand] = catCounts[isLand] || {};
        catCounts[isLand][minRarity] = (catCounts[isLand][minRarity] || 0) + 1;
        catCounts[isLand]['total'] = (catCounts[isLand]['total'] || 0) + 1;

        return catCounts;
    }, {
        all:     { common: 0, uncommon: 0, rare: 0, mythic: 0, total: 0 },
        nonLand: { common: 0, uncommon: 0, rare: 0, mythic: 0, total: 0 },
        land:    { common: 0, uncommon: 0, rare: 0, mythic: 0, total: 0 },
    });

    if (mappedRarities.all.common === totalCards) {
        categories.add('pauper');
    } else if (mappedRarities.nonLand.common + mappedRarities.land.total === totalCards) {
        categories.add('pauper+');
    } else if (mappedRarities.nonLand.common >= (mappedRarities.nonLand.total) * 0.925 && mappedRarities.land.common === mappedRarities.land.total) {
        categories.add('pauper-ish');
    } else if (mappedRarities.nonLand.common >= (mappedRarities.nonLand.total) * 0.925) {
        categories.add('pauper+ish');
    } else if (mappedRarities.all.common + mappedRarities.all.uncommon === totalCards) {
        categories.add('peasant');
    } else if (mappedRarities.nonLand.common + mappedRarities.nonLand.uncommon + mappedRarities.land.total === totalCards) {
        categories.add('peasant+');
    } else if (mappedRarities.nonLand.common + mappedRarities.nonLand.uncommon >= (mappedRarities.nonLand.total) * 0.925 && mappedRarities.land.common + mappedRarities.land.uncommon === mappedRarities.land.total) {
        categories.add('peasant-ish');
    } else if ((mappedRarities.nonLand.common + mappedRarities.nonLand.uncommon) >= (mappedRarities.nonLand.total * 0.925)) {
        categories.add('peasant+ish');
    }

    if (cards.some(c => powerOracleIds.includes(c.oracleId))) {
        categories.add('powered');
    }

    // Flag something as a desert if it has more than 28% lands.
    if (mappedRarities.land.total >= totalCards * 0.28) {
        categories.add('desert');
    }

    return Array.from(categories);
}
