import { describe, it, expect } from 'vitest';
import { weightedQuantile, theilSen, kaplanMeier, largestRemainder } from './stats';

describe('weightedQuantile', () => {
    it('returns the first value whose cumulative weight reaches the target', () => {
        expect(weightedQuantile([1, 2, 3], [1, 1, 2], 0.5)).toBe(2);
    });

    it('returns NaN when all weights are zero', () => {
        expect(weightedQuantile([1, 2, 3], [0, 0, 0], 0.5)).toBeNaN();
    });

    it('returns NaN for empty arrays', () => {
        expect(weightedQuantile([], [], 0.5)).toBeNaN();
    });

    it('ignores entries with non-positive weight', () => {
        expect(weightedQuantile([1, 2, 3], [1, -1, 1], 1)).toBe(3);
    });
});

describe('theilSen', () => {
    it('returns the median pairwise slope', () => {
        expect(theilSen([0, 1, 2, 3, 4], [0, 1, 2, 3, 100])).toBe(1);
    });

    it('returns 0 when fewer than 2 points are given', () => {
        expect(theilSen([0], [0])).toBe(0);
    });

    it('returns 0 when no pair has distinct xs', () => {
        expect(theilSen([1, 1, 1], [1, 2, 3])).toBe(0);
    });
});

describe('kaplanMeier', () => {
    it('steps the survival curve down only at event times', () => {
        const spells = [
            { duration: 3, event: true },
            { duration: 5, event: false },
            { duration: 7, event: true },
            { duration: 7, event: true },
        ];
        expect(kaplanMeier(spells)).toEqual([
            { t: 0, s: 1 },
            { t: 3, s: 0.75 },
            { t: 7, s: 0 },
        ]);
    });

    it('counts a delayed-entry spell at risk only after its entry time', () => {
        const spells = [
            { duration: 10, event: true },
            { duration: 20, event: true, entry: 15 },
            { duration: 30, event: false, entry: 0 },
        ];
        expect(kaplanMeier(spells)).toEqual([
            { t: 0, s: 1 },
            { t: 10, s: 0.5 },
            { t: 20, s: 0.25 },
        ]);
    });
});

describe('largestRemainder', () => {
    it('allocates remaining units by descending fractional remainder', () => {
        expect(largestRemainder({ a: 0.5, b: 0.3, c: 0.2 }, 7)).toEqual({ a: 4, b: 2, c: 1 });
    });

    it('returns all zeros when shares sum to 0', () => {
        expect(largestRemainder({ a: 0, b: 0 }, 5)).toEqual({ a: 0, b: 0 });
    });

    it('sums to total for an uneven case, ties broken by key order', () => {
        const result = largestRemainder({ a: 1, b: 1, c: 1 }, 10);
        expect(Object.values(result).reduce((sum, n) => sum + n, 0)).toBe(10);
        expect(result).toEqual({ a: 4, b: 3, c: 3 });
    });
});
