import { describe, it, expect } from 'vitest';
import { computeEligibility } from './eligibility';

function printing(overrides: Record<string, any>): string {
    return JSON.stringify({
        oracle_id: 'oracle1',
        rarity: 'common',
        games: ['paper'],
        released_at: '2020-01-01',
        set: 'aaa',
        ...overrides,
    });
}

describe('computeEligibility', () => {
    const lines = [
        printing({ rarity: 'rare', games: ['paper'], released_at: '2020-01-01', set: 'aaa' }),
        printing({ rarity: 'uncommon', games: ['paper'], released_at: '2024-06-01', set: 'bbb' }),
        printing({ rarity: 'common', games: ['arena'], released_at: '2023-01-01', set: 'ccc' }),
    ];

    it('firstPrinting picks the earliest qualifying printing of any rarity', async () => {
        const result = await computeEligibility(lines, 'firstPrinting');
        expect(result.get('oracle1')).toEqual({
            date: Date.parse('2020-01-01'),
            setCode: 'aaa',
            fallback: false,
        });
    });

    it('firstCommonOrUncommon ignores the arena-only common and picks the uncommon', async () => {
        const result = await computeEligibility(lines, 'firstCommonOrUncommon');
        expect(result.get('oracle1')).toEqual({
            date: Date.parse('2024-06-01'),
            setCode: 'bbb',
            fallback: false,
        });
    });

    it('firstCommon falls back to the earliest qualifying printing when no common qualifies', async () => {
        const result = await computeEligibility(lines, 'firstCommon');
        expect(result.get('oracle1')).toEqual({
            date: Date.parse('2020-01-01'),
            setCode: 'aaa',
            fallback: true,
        });
    });

    it('breaks ties on released_at by the lowest set code', async () => {
        const tiedLines = [
            printing({ rarity: 'rare', games: ['paper'], released_at: '2020-01-01', set: 'zzz' }),
            printing({ rarity: 'rare', games: ['mtgo'], released_at: '2020-01-01', set: 'aaa' }),
        ];
        const result = await computeEligibility(tiedLines, 'firstPrinting');
        expect(result.get('oracle1')).toEqual({
            date: Date.parse('2020-01-01'),
            setCode: 'aaa',
            fallback: false,
        });
    });

    it('skips printings missing oracle_id', async () => {
        const result = await computeEligibility([printing({ oracle_id: undefined })], 'firstPrinting');
        expect(result.size).toBe(0);
    });

    it('skips arena-only printings entirely, leaving no entry when none qualify', async () => {
        const result = await computeEligibility(
            [printing({ games: ['arena'] })],
            'firstPrinting',
        );
        expect(result.size).toBe(0);
    });

    it('skips blank lines', async () => {
        const result = await computeEligibility(['', '   ', printing({})], 'firstPrinting');
        expect(result.size).toBe(1);
    });

    it('throws with the 1-based line number for malformed JSON', async () => {
        await expect(computeEligibility(['not json'], 'firstPrinting')).rejects.toThrow(/line 1/);
        await expect(computeEligibility([printing({}), 'not json'], 'firstPrinting')).rejects.toThrow(/line 2/);
    });
});
