import { describe, it, expect } from 'vitest';
import { buildKeywordCosts, keywordCost, EVERGREEN_KEYWORD_COST, DEFAULT_KEYWORD_COST_TABLE } from './KeywordCosts';

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
