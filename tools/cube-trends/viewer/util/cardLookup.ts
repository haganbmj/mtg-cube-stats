import type { CardsResult, CardTrend } from '../../analysis/cards';

export function buildCardLookup(cards: CardsResult): Map<string, CardTrend> {
    return new Map(cards.cards.map((card) => [card.key, card]));
}
