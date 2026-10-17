import { describe, it, expect } from 'vitest';
import { buildKeywordCosts, keywordCost, EVERGREEN_KEYWORD_COST, ABILITY_WORD_KEYWORD_COST, DEFAULT_KEYWORD_COST_TABLE } from './KeywordCosts';

describe('buildKeywordCosts', () => {
    it('uses the median reminder-text word count across cards', () => {
        const t = buildKeywordCosts([
            { oracleText: 'Cascade (one two three)', keywords: ['Cascade'] },
            { oracleText: 'Cascade (one two three four five)', keywords: ['Cascade'] },
            { oracleText: 'Cascade (one two three four five six seven)', keywords: ['Cascade'] },
        ]);
        expect(t.costs.Cascade).toBe(5);
    });
    it('matches keywords with costs between the keyword and the reminder', () => {
        const t = buildKeywordCosts([{ oracleText: 'Kicker {2} ({2}: Attach to target creature.)', keywords: ['Kicker'] }]);
        expect(t.costs.Kicker).toBe(5); // existing splitter yields ['{2', 'Attach', 'to', 'target', 'creature.']
    });
    it('matches a keyword later in a comma-separated keyword line', () => {
        const t = buildKeywordCosts([{ oracleText: 'Haste, Mutate {2}{R} (alpha beta)', keywords: ['Haste', 'Mutate'] }]);
        expect(t.costs.Mutate).toBe(2);
    });
    it('does not match a keyword mentioned mid-sentence', () => {
        const t = buildKeywordCosts([{ oracleText: 'Target creature gains cascade until end of turn. (x y z)', keywords: ['Cascade'] }]);
        expect(t.costs.Cascade).toBe(t.fallback);
    });
    it('assigns EVERGREEN_KEYWORD_COST to evergreen keywords even when reminder text exists', () => {
        const t = buildKeywordCosts([{ oracleText: 'Flying (a b c d e f g h i j)', keywords: ['Flying'] }]);
        expect(t.costs.Flying).toBe(EVERGREEN_KEYWORD_COST);
    });
    it('fallback is the median of observed non-evergreen costs, rounded', () => {
        const t = buildKeywordCosts([
            { oracleText: 'Storm (a b)', keywords: ['Storm'] },
            { oracleText: 'Delve (a b c d e f)', keywords: ['Delve'] },
            { oracleText: 'Treasure stuff', keywords: ['Treasure'] },
        ]);
        expect(t.fallback).toBe(4);
        expect(t.costs.Treasure).toBe(4);
    });
    const storm = { oracleText: 'Storm (a b)', keywords: ['Storm'] }; // makes fallback 2
    it('does not charge a keyword for another keyword\'s reminder text (Hedron Crab)', () => {
        const t = buildKeywordCosts([storm, {
            oracleText: 'Landfall — Whenever a land you control enters, target player mills three cards. (To mill a card, a player puts the top card of their library into their graveyard.)',
            keywords: ['Landfall', 'Mill'],
        }]);
        expect(t.costs.Landfall).toBe(t.fallback);
        expect(t.fallback).toBe(2);
    });
    it('ignores reminder text after an em dash', () => {
        const t = buildKeywordCosts([storm, { oracleText: 'Threshold — Creatures get +1/+1. (x y z w v)', keywords: ['Threshold'] }]);
        expect(t.costs.Threshold).toBe(2);
    });
    it('assigns ABILITY_WORD_KEYWORD_COST to ability words and excludes them from the fallback median', () => {
        const t = buildKeywordCosts([
            storm,
            { oracleText: 'Delve (a b c d e f)', keywords: ['Delve'] },
            { oracleText: 'Landfall (a b c d e f g h i j k l m n)', keywords: ['Landfall'] },
        ], ['Landfall']);
        expect(t.costs.Landfall).toBe(ABILITY_WORD_KEYWORD_COST);
        expect(ABILITY_WORD_KEYWORD_COST).toBe(3);
        expect(t.fallback).toBe(4); // median(2, 6), Landfall excluded
    });
    it('keeps a real keyword\'s own reminder when a different keyword appears after it', () => {
        const t = buildKeywordCosts([{ oracleText: 'Cycling {2} ({2}, Discard this card: Draw a card.)\nLandfall — x', keywords: ['Cycling', 'Landfall'] }]);
        expect(t.costs.Cycling).toBe(7); // splitter yields ['{2', 'Discard', 'this', 'card', 'Draw', 'a', 'card.']
    });
});

describe('keywordCost', () => {
    it('returns the table cost, else EVERGREEN_KEYWORD_COST for evergreen, else fallback', () => {
        const t = { costs: { Cascade: 42 }, fallback: 9 };
        expect(keywordCost('Cascade', t)).toBe(42);
        expect(keywordCost('Trample', t)).toBe(EVERGREEN_KEYWORD_COST);
        expect(keywordCost('Unseen', t)).toBe(9);
        expect(keywordCost('Unseen', DEFAULT_KEYWORD_COST_TABLE)).toBe(15);
    });
});
