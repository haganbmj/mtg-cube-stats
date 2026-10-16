import { describe, it, expect } from 'vitest';
import { makeContext } from './fixtures';
import { analyzeCards } from './cards';

const DAY = 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeCards', () => {
    it('computes momentum for a card rising linearly over 14-day samples', () => {
        const samples = [0, 14 * DAY, 28 * DAY, 42 * DAY];
        // ir target [0, 0.1, 0.2, 0.3] across 10 cubes, present in 0/1/2/3 cubes respectively.
        const cubes = Array.from({ length: 10 }, (_, i) => ({
            id: `cube${i}`,
            revisions: samples.map((date, k) => ({
                id: `cube${i}-${k}`,
                date,
                cards: i < k ? ['bolt'] : [],
            })),
            grid: samples.map((_, k) => `cube${i}-${k}`),
        }));

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cards } = analyzeCards(ctx);
        const bolt = cards.find((c) => c.key === 'bolt')!;

        expect(bolt.ir).toEqual([0, 0.1, 0.2, 0.3]);
        expect(bolt.momentum).toBeCloseTo((0.1 / 14) * 30, 4);
        expect(bolt.cubesPresent).toEqual([[], [0], [0, 1], [0, 1, 2]]);
    });

    it('returns null momentum when peak inclusion rate is below the threshold', () => {
        const samples = [0, 14 * DAY];
        // 25 cubes, 1 present -> ir = 0.04, below default momentumMinPeakIr 0.05.
        const cubes = Array.from({ length: 25 }, (_, i) => ({
            id: `cube${i}`,
            revisions: [
                { id: `cube${i}-0`, date: 0, cards: [] },
                { id: `cube${i}-1`, date: 14 * DAY, cards: i === 0 ? ['bolt'] : [] },
            ],
            grid: [`cube${i}-0`, `cube${i}-1`],
        }));

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cards } = analyzeCards(ctx);
        const bolt = cards.find((c) => c.key === 'bolt')!;

        expect(bolt.peak).toBeCloseTo(0.04, 5);
        expect(bolt.momentum).toBeNull();
    });

    it('sorts cards by current inclusion rate descending, then key ascending', () => {
        const samples = [0];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: 0, cards: ['low'] }], grid: ['a-0'] },
            { id: 'b', revisions: [{ id: 'b-0', date: 0, cards: ['high', 'tie'] }], grid: ['b-0'] },
            { id: 'c', revisions: [{ id: 'c-0', date: 0, cards: ['high', 'tie'] }], grid: ['c-0'] },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cards } = analyzeCards(ctx);

        expect(cards.map((c) => c.key)).toEqual(['high', 'tie', 'low']);
    });

    it('computes delta relative to the nearest sample at least deltaWindowDays back', () => {
        const samples = [0, 30 * DAY, 60 * DAY, 90 * DAY, 120 * DAY];
        const cubes = [
            {
                id: 'a',
                revisions: samples.map((date, k) => ({ id: `a-${k}`, date, cards: k >= 2 ? ['bolt'] : [] })),
                grid: samples.map((_, k) => `a-${k}`),
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cards } = analyzeCards(ctx);
        const bolt = cards.find((c) => c.key === 'bolt')!;

        // last=120d, cutoff=30d -> j is the first sample >= 30d, i.e. index 1 (ir=0).
        expect(bolt.ir).toEqual([0, 0, 1, 1, 1]);
        expect(bolt.delta).toBe(1);
    });

    it('leaves firstSeen/lastSeen null when the card is never present', () => {
        const samples = [0, 14 * DAY];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: 0, cards: ['ghost'] }, { id: 'a-1', date: 14 * DAY, cards: [] }], grid: ['a-0', 'a-1'] },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cards } = analyzeCards(ctx);
        const ghost = cards.find((c) => c.key === 'ghost')!;

        expect(ghost.firstSeen).toBe(0);
        expect(ghost.lastSeen).toBe(0);
    });
});
