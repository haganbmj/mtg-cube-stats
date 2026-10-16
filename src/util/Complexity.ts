import type { ComplexityBreakdown, ComplexityComponents, CubeCard, KeywordCostTable } from '../types';
import { keywordCost } from './KeywordCosts';

type ComponentKey = keyof ComplexityComponents;

const COMPONENT_KEYS: ComponentKey[] = [
    'nonLandWords',
    'landWords',
    'distinctKeywordLoad',
    'keywordFrequencyLoad',
    'familiarity',
    'layoutLoad',
];

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

export const COMPLEXITY_BOUNDS: Record<ComponentKey, { low: number; high: number }> = {
    nonLandWords: { low: 16.91, high: 30.70 },
    landWords: { low: 11.34, high: 25.57 },
    distinctKeywordLoad: { low: 19.25, high: 81.12 },
    keywordFrequencyLoad: { low: 3.90, high: 10.22 },
    familiarity: { low: 1.63, high: 6.80 },
    layoutLoad: { low: 0.00, high: 0.06 },
};

export const COMPLEXITY_WEIGHTS: Record<ComponentKey, number> = {
    nonLandWords: 5,
    landWords: 1.25,
    distinctKeywordLoad: 1,
    keywordFrequencyLoad: 0.5,
    familiarity: 0.25,
    layoutLoad: 0.75,
};

export const COMPLEXITY_COMPONENT_LABELS: Record<ComponentKey, string> = {
    nonLandWords: 'Non-land words',
    landWords: 'Land words',
    distinctKeywordLoad: 'Distinct keywords',
    keywordFrequencyLoad: 'Keywords per card',
    familiarity: 'Unfamiliarity',
    layoutLoad: 'Layouts',
};

export function computeComplexityComponents(cards: CubeCard[], table: KeywordCostTable): ComplexityComponents {
    const totalCards = cards?.length ?? 0;
    let nonLandWordSum = 0, nonLandCount = 0;
    let landWordSum = 0, landCount = 0;
    let keywordCostSum = 0, popularitySum = 0, layoutSum = 0;
    const distinctKeywords = new Set<string>();

    for (const card of cards ?? []) {
        const words = card.oracleTextWordCountMinusParen ?? 0;
        if (card.effectiveTypes?.includes('Land')) {
            landWordSum += words;
            landCount++;
        } else {
            nonLandWordSum += words;
            nonLandCount++;
        }

        for (const keyword of card.keywords ?? []) {
            keywordCostSum += keywordCost(keyword, table);
            distinctKeywords.add(keyword);
        }

        popularitySum += card.popularity ?? 0;
        layoutSum += LAYOUT_WEIGHTS[card.layout ?? 'normal'] ?? 0;
    }

    let distinctKeywordCostSum = 0;
    for (const keyword of distinctKeywords) {
        distinctKeywordCostSum += keywordCost(keyword, table);
    }

    const perCard = (sum: number) => totalCards === 0 ? 0 : sum / totalCards;

    return {
        nonLandWords: nonLandCount === 0 ? 0 : nonLandWordSum / nonLandCount,
        landWords: landCount === 0 ? 0 : landWordSum / landCount,
        distinctKeywordLoad: totalCards === 0 ? 0 : distinctKeywordCostSum / totalCards ** DISTINCT_KEYWORD_SIZE_EXPONENT,
        keywordFrequencyLoad: perCard(keywordCostSum),
        familiarity: perCard(popularitySum),
        layoutLoad: perCard(layoutSum),
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
    bounds: Record<ComponentKey, { low: number; high: number }> = COMPLEXITY_BOUNDS,
    weights: Record<ComponentKey, number> = COMPLEXITY_WEIGHTS,
): { score: number; breakdown: ComplexityBreakdown } {
    const normalized = {} as ComplexityComponents;
    let weightedSum = 0, weightTotal = 0;

    for (const key of COMPONENT_KEYS) {
        const value = normalize(raw[key], bounds[key]);
        normalized[key] = key === 'familiarity' ? 1 - value : value;
        weightedSum += weights[key] * normalized[key];
        weightTotal += weights[key];
    }

    const score = weightTotal === 0 ? 0 : Math.round(100 * weightedSum / weightTotal);
    return { score, breakdown: { raw: { ...raw }, normalized } };
}

export function complexityBreakdownHtml(breakdown: ComplexityBreakdown): string {
    return COMPONENT_KEYS
        .map(key => `${COMPLEXITY_COMPONENT_LABELS[key]}: ${breakdown.normalized[key].toFixed(2)} (${breakdown.raw[key].toFixed(1)})`)
        .join('<br>');
}
