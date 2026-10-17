import type { ComplexityBreakdown, ComplexityComponentKey, ComplexityComponents, CubeCard, KeywordCostTable } from '../types';
import { keywordCost } from './KeywordCosts';

export const COMPLEXITY_COMPONENT_KEYS: ComplexityComponentKey[] = [
    'nonLandWords',
    'landWords',
    'nonLandKeywordText',
    'landKeywordText',
    'nonLandFamiliarity',
    'landFamiliarity',
    'nonLandLayouts',
    'landLayouts',
    'distinctKeywordLoad',
];

export const FAMILIARITY_KEYS: ComplexityComponentKey[] = ['nonLandFamiliarity', 'landFamiliarity'];

export const LAND_COUNTERPARTS: Partial<Record<ComplexityComponentKey, ComplexityComponentKey>> = {
    landWords: 'nonLandWords',
    landKeywordText: 'nonLandKeywordText',
    landFamiliarity: 'nonLandFamiliarity',
    landLayouts: 'nonLandLayouts',
};

export const LAYOUT_WEIGHTS: Record<string, number> = {
    saga: 0.33,
    class: 0.33,
    case: 0.33,
    adventure: 0.33,
    prototype: 0.33,
    leveler: 0.33,
    split: 0.33,
    transform: 0.66,
    modal_dfc: 0.66,
    flip: 0.66,
    prepare: 0.66,
    meld: 1.0,
    mutate: 1.0,
};

export const DISTINCT_KEYWORD_SIZE_EXPONENT = 0.5;

export const COMPLEXITY_BOUNDS: Record<ComplexityComponentKey, { low: number; high: number }> = {
    nonLandWords: { low: 16.344, high: 30.618 },
    landWords: { low: 13.950, high: 24.229 },
    nonLandKeywordText: { low: 3.922, high: 9.375 },
    landKeywordText: { low: 0.028, high: 4.900 },
    nonLandFamiliarity: { low: 1.711, high: 6.506 },
    landFamiliarity: { low: 2.176, high: 10.796 },
    nonLandLayouts: { low: 0.000, high: 0.041 },
    landLayouts: { low: 0.000, high: 0.159 },
    distinctKeywordLoad: { low: 18.916, high: 76.250 },
};

export const COMPLEXITY_WEIGHTS: Record<ComplexityComponentKey, number> = {
    nonLandWords: 8,
    landWords: 0.25,
    nonLandKeywordText: 1,
    landKeywordText: 0.25,
    nonLandFamiliarity: 0.2,
    landFamiliarity: 0.1,
    nonLandLayouts: 0.5,
    landLayouts: 0.25,
    distinctKeywordLoad: 3,
};

export const COMPLEXITY_COMPONENT_LABELS: Record<ComplexityComponentKey, string> = {
    nonLandWords: 'Non-land words',
    landWords: 'Land words',
    nonLandKeywordText: 'Non-land keyword text',
    landKeywordText: 'Land keyword text',
    nonLandFamiliarity: 'Non-land unfamiliarity',
    landFamiliarity: 'Land unfamiliarity',
    nonLandLayouts: 'Non-land layouts',
    landLayouts: 'Land layouts',
    distinctKeywordLoad: 'Distinct keywords',
};

interface GroupSums {
    count: number;
    words: number;
    keywordText: number;
    popularity: number;
    layouts: number;
}

const emptyGroup = (): GroupSums => ({ count: 0, words: 0, keywordText: 0, popularity: 0, layouts: 0 });

const average = (sum: number, group: GroupSums): number | null => group.count === 0 ? null : sum / group.count;

export function computeComplexityComponents(cards: CubeCard[], table: KeywordCostTable): ComplexityComponents {
    const totalCards = cards?.length ?? 0;
    const nonLand = emptyGroup();
    const land = emptyGroup();
    const seenOracleIds = new Set<string>();
    const distinctKeywords = new Set<string>();

    for (const card of cards ?? []) {
        if (seenOracleIds.has(card.oracleId)) {
            continue;
        }
        seenOracleIds.add(card.oracleId);

        const group = card.effectiveTypes?.includes('Land') ? land : nonLand;
        group.count++;
        group.words += card.oracleTextWordCountMinusParen ?? 0;
        for (const keyword of card.keywords ?? []) {
            group.keywordText += keywordCost(keyword, table);
            distinctKeywords.add(keyword);
        }
        group.popularity += card.popularity ?? 0;
        group.layouts += LAYOUT_WEIGHTS[card.layout ?? 'normal'] ?? 0;
    }

    let distinctKeywordCostSum = 0;
    for (const keyword of distinctKeywords) {
        distinctKeywordCostSum += keywordCost(keyword, table);
    }

    return {
        nonLandWords: average(nonLand.words, nonLand),
        landWords: average(land.words, land),
        nonLandKeywordText: average(nonLand.keywordText, nonLand),
        landKeywordText: average(land.keywordText, land),
        nonLandFamiliarity: average(nonLand.popularity, nonLand),
        landFamiliarity: average(land.popularity, land),
        nonLandLayouts: average(nonLand.layouts, nonLand),
        landLayouts: average(land.layouts, land),
        distinctKeywordLoad: totalCards === 0 ? 0 : distinctKeywordCostSum / totalCards ** DISTINCT_KEYWORD_SIZE_EXPONENT,
    };
}

function normalize(value: number, { low, high }: { low: number; high: number }): number {
    if (high === low) {
        return 0;
    }
    return Math.min(1, Math.max(0, (value - low) / (high - low)));
}

export function scoreComplexity(
    raw: ComplexityComponents,
    bounds: Record<ComplexityComponentKey, { low: number; high: number }> = COMPLEXITY_BOUNDS,
    weights: Record<ComplexityComponentKey, number> = COMPLEXITY_WEIGHTS,
): { score: number; breakdown: ComplexityBreakdown } {
    const normalized = {} as ComplexityComponents;
    let weightedSum = 0, weightTotal = 0;

    for (const key of COMPLEXITY_COMPONENT_KEYS) {
        const rawValue = raw[key];
        if (rawValue === null) {
            normalized[key] = null;
            continue;
        }
        const value = normalize(rawValue, bounds[key]);
        const component = FAMILIARITY_KEYS.includes(key) ? 1 - value : value;
        normalized[key] = component;
        weightedSum += weights[key] * component;
        weightTotal += weights[key];
    }

    const score = weightTotal === 0 ? 0 : Math.round(100 * weightedSum / weightTotal);
    return { score, breakdown: { raw: { ...raw }, normalized } };
}

function formatRaw(key: ComplexityComponentKey, value: number): string {
    if (key === 'nonLandLayouts' || key === 'landLayouts') {
        return value.toFixed(3);
    }
    if (FAMILIARITY_KEYS.includes(key)) {
        return `pop ${value.toFixed(1)}%`;
    }
    return value.toFixed(1);
}

export function complexityBreakdownHtml(breakdown: ComplexityBreakdown): string {
    return COMPLEXITY_COMPONENT_KEYS
        .map(key => {
            const label = COMPLEXITY_COMPONENT_LABELS[key];
            const raw = breakdown.raw[key];
            const normalized = breakdown.normalized[key];
            if (raw === null || normalized === null) {
                return `${label}: n/a`;
            }
            return `${label}: ${normalized.toFixed(2)} (${formatRaw(key, raw)})`;
        })
        .join('<br>');
}
