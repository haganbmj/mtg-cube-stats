import type { ScryfallCard } from '../../../src/types/scryfall';
import type { Eligibility } from '../types';

export type ColorCategory = 'W' | 'U' | 'B' | 'R' | 'G' | 'M' | 'C' | 'L';

export interface CardInfo {
    oracleId: string;
    name: string;
    urlFront: string;
    colors: string[];
    colorCategory: ColorCategory;
    primaryType: string;
    cmc: number;
    isBasic: boolean;
    eligibility: Eligibility | null;
}

export function colorCategory(card: ScryfallCard): ColorCategory {
    if (card.primaryType === 'Land') {
        return 'L';
    }
    if (card.colors.length === 0) {
        return 'C';
    }
    if (card.colors.length > 1) {
        return 'M';
    }
    return card.colors[0] as ColorCategory;
}

export function buildCardInfo(oracleId: string, card: ScryfallCard, eligibility: Map<string, Eligibility>): CardInfo {
    return {
        oracleId,
        name: card.name,
        urlFront: card.urlFront,
        colors: card.colors,
        colorCategory: colorCategory(card),
        primaryType: card.primaryType,
        cmc: card.cmc,
        isBasic: card.effectiveTypes.includes('Basic'),
        eligibility: eligibility.get(oracleId) ?? null,
    };
}

// Copy keys are the base oracle id with trailing '+' per extra copy, e.g. 'bolt', 'bolt+', 'bolt++'.
export function baseOracleId(key: string): string {
    return key.replace(/\+*$/, '');
}

export function copyNumber(key: string): number {
    const trailing = key.match(/\+*$/)?.[0] ?? '';
    return 1 + trailing.length;
}
