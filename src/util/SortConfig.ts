export type SortDirection = 'auto' | 'ascending' | 'descending';

export interface SortProperty {
    prop: string;
    label: string;
    autoDirection: 'ascending' | 'descending';
    sortMethod?: (a: any, b: any) => number;
}

export const cardSortProperties: SortProperty[] = [
    { prop: 'name', label: 'Name', autoDirection: 'ascending' },
    { prop: 'cubeCount', label: 'Cube Count', autoDirection: 'descending' },
    { prop: 'globalRatePercent_total', label: 'Global Rate', autoDirection: 'descending' },
    { prop: 'globalRatePercent_broad_pauper', label: 'Global Rate (Pauper)', autoDirection: 'descending' },
    { prop: 'globalRatePercent_broad_peasant', label: 'Global Rate (Peasant)', autoDirection: 'descending' },
    { prop: 'cmc', label: 'Mana Value', autoDirection: 'ascending' },
    { prop: 'releaseDate', label: 'Release Date', autoDirection: 'descending' },
    { prop: 'minRarity', label: 'Rarity', autoDirection: 'descending' },
    { prop: 'elo', label: 'Elo', autoDirection: 'descending' },
    { prop: 'popularity', label: 'Popularity', autoDirection: 'descending' },
    { prop: 'minPriceUsd', label: 'Price (USD)', autoDirection: 'descending' },
    { prop: 'minPriceTix', label: 'Price (Tix)', autoDirection: 'descending' },
    { prop: 'oracleTextWordCountMinusParen', label: 'Word Count', autoDirection: 'descending' },
    { prop: 'power', label: 'Power', autoDirection: 'descending' },
    { prop: 'toughness', label: 'Toughness', autoDirection: 'descending' },
];

export const overviewSortProperties: SortProperty[] = [
    { prop: 'name', label: 'Name', autoDirection: 'ascending' },
    { prop: 'owner', label: 'Owner', autoDirection: 'ascending' },
    { prop: 'stats.totalCards', label: 'Card Count', autoDirection: 'descending' },
    { prop: 'avgSimilarityScore', label: 'Similarity', autoDirection: 'descending' },
    { prop: 'stats.newCards', label: 'New Cards', autoDirection: 'descending' },
    { prop: 'lastModified', label: 'Modified Date', autoDirection: 'descending' },
    { prop: 'followerCount', label: 'Followers', autoDirection: 'descending' },
    { prop: 'stats.averageNonLandCmc', label: 'Avg Mana Value', autoDirection: 'ascending' },
    { prop: 'stats.averageWordCount', label: 'Avg Word Count', autoDirection: 'descending' },
    { prop: 'stats.uniqueNonEvergreenKeywords', label: 'Non-Evergreen Keywords', autoDirection: 'descending' },
    { prop: 'stats.cardCounts.makesTokens', label: 'Makes Tokens', autoDirection: 'descending' },
    { prop: 'stats.medianReleaseYear', label: 'Median Release Year', autoDirection: 'descending' },
    { prop: 'stats.cardCounts.universesBeyond', label: 'Universes Beyond', autoDirection: 'descending' },
    { prop: 'stats.cardCounts.supplementalProduct', label: 'Supplemental Product', autoDirection: 'descending' },
];

export function resolveDirection(direction: SortDirection, prop: string, properties: SortProperty[]): 'ascending' | 'descending' {
    if (direction !== 'auto') return direction;
    const entry = properties.find(p => p.prop === prop);
    return entry?.autoDirection ?? 'ascending';
}

/**
 * Remove order:/sort: and direction:/dir: tokens from a raw query string.
 * Preserves all other filter conditions.
 */
export function stripSortTokens(query: string): string {
    // Match order:value, sort:value, direction:value, dir:value (with optional quotes)
    return query
        .replace(/\b(?:order|sort|direction|dir):[^\s]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
