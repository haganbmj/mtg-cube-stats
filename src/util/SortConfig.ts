export type SortDirection = 'auto' | 'ascending' | 'descending';

export interface SortProperty {
    prop: string;
    label: string;
    autoDirection: 'ascending' | 'descending';
    sortMethod?: (a: any, b: any) => number;
}

export const cardSortProperties: SortProperty[] = [
    { prop: 'name', label: 'Name', autoDirection: 'ascending' },
    { prop: 'cubeCount', label: 'Number of Cubes', autoDirection: 'descending' },
    { prop: 'globalRatePercent', label: 'Global Inclusion Rate', autoDirection: 'descending' },
    { prop: 'cmc', label: 'Mana Value', autoDirection: 'ascending' },
    { prop: 'releaseDate', label: 'Release Date', autoDirection: 'descending' },
    { prop: 'minRarity', label: 'Rarity', autoDirection: 'descending' },
    { prop: 'elo', label: 'Elo', autoDirection: 'descending' },
    { prop: 'popularity', label: 'Popularity', autoDirection: 'descending' },
    { prop: 'minPriceUsd', label: 'Price (USD)', autoDirection: 'descending' },
    { prop: 'minPriceTix', label: 'Price (Tix)', autoDirection: 'descending' },
    { prop: 'oracleTextWordCountMinusParen', label: 'Word Count', autoDirection: 'ascending' },
    { prop: 'power', label: 'Power', autoDirection: 'ascending' },
    { prop: 'toughness', label: 'Toughness', autoDirection: 'ascending' },
];

export const overviewSortProperties: SortProperty[] = [
    { prop: 'name', label: 'Name', autoDirection: 'ascending' },
    { prop: 'owner', label: 'Owner', autoDirection: 'ascending' },
    { prop: 'stats.totalCards', label: 'Card Count', autoDirection: 'descending' },
    { prop: 'avgSimilarityScore', label: 'Similarity', autoDirection: 'descending' },
    { prop: 'stats.newCards', label: 'New Cards', autoDirection: 'descending' },
    { prop: 'stats.averageNonLandCmc', label: 'Avg Mana Value', autoDirection: 'ascending' },
    { prop: 'stats.averageWordCount', label: 'Avg Word Count', autoDirection: 'ascending' },
];

export function resolveDirection(direction: SortDirection, prop: string, properties: SortProperty[]): 'ascending' | 'descending' {
    if (direction !== 'auto') return direction;
    const entry = properties.find(p => p.prop === prop);
    return entry?.autoDirection ?? 'ascending';
}
