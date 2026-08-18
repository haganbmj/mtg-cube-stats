import { describe, it, expect } from 'vitest';
import {
    jaccardSimilarity,
    suffixedDuplicates,
    cosineSimilarity,
    intersectionSizeOf,
} from './SimiliartyFunctions';

describe('suffixedDuplicates', () => {
    it('returns empty for empty input', () => {
        expect(suffixedDuplicates([])).toEqual([]);
    });

    it('returns unique items unchanged when there are no duplicates', () => {
        expect(suffixedDuplicates(['a', 'b', 'c']).sort()).toEqual(['a', 'b', 'c']);
    });

    it('suffixes a single duplicate with +', () => {
        // Two copies of 'a' produce: original 'a' plus one suffixed 'a+'.
        expect(suffixedDuplicates(['a', 'a']).sort()).toEqual(['a', 'a+']);
    });

    it('suffixes a triple duplicate recursively (a, a+, a++)', () => {
        expect(suffixedDuplicates(['a', 'a', 'a']).sort()).toEqual(['a', 'a+', 'a++']);
    });

    it('handles multiple independent duplicates', () => {
        expect(suffixedDuplicates(['a', 'a', 'b', 'b', 'c']).sort()).toEqual(['a', 'a+', 'b', 'b+', 'c']);
    });

    it('handles order-independence — same output regardless of input order', () => {
        const a = suffixedDuplicates(['x', 'y', 'x', 'z', 'y']).sort();
        const b = suffixedDuplicates(['y', 'x', 'z', 'y', 'x']).sort();
        expect(a).toEqual(b);
    });
});

describe('cosineSimilarity', () => {
    it('is 1 for identical lists', () => {
        expect(cosineSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeCloseTo(1, 10);
    });

    it('is 0 for disjoint lists', () => {
        expect(cosineSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
    });

    it('is 0 when either list is empty', () => {
        expect(cosineSimilarity([], ['a'])).toBe(0);
        expect(cosineSimilarity(['a'], [])).toBe(0);
    });

    it('is 0 when both lists are empty (no divide-by-zero explosion)', () => {
        expect(cosineSimilarity([], [])).toBe(0);
    });

    it('is symmetric', () => {
        const a = cosineSimilarity(['a', 'b', 'c'], ['b', 'c', 'd']);
        const b = cosineSimilarity(['b', 'c', 'd'], ['a', 'b', 'c']);
        expect(a).toBeCloseTo(b, 10);
    });

    it('produces a value in (0, 1) for partial overlap', () => {
        const s = cosineSimilarity(['a', 'b', 'c', 'd'], ['a', 'b', 'e', 'f']);
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThan(1);
    });

    it('treats suffixed duplicates as distinct elements (so multi-copies do not collapse)', () => {
        // Two cubes share only 'a'; one has 'a' twice, the other once. Suffixed form: ['a','a+'] vs ['a'].
        // Only 'a' matches; 'a+' is exclusive to the first. Score < 1 by design.
        const s = cosineSimilarity(['a', 'a+'], ['a']);
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThan(1);
    });

    it('gives a higher score when both cubes share the extra copy', () => {
        const partial = cosineSimilarity(['a', 'a+'], ['a']);
        const full = cosineSimilarity(['a', 'a+'], ['a', 'a+']);
        expect(full).toBeGreaterThan(partial);
        expect(full).toBeCloseTo(1, 10);
    });
});

describe('intersectionSizeOf', () => {
    it('is 0 for disjoint lists', () => {
        expect(intersectionSizeOf(['a', 'b'], ['c', 'd'])).toBe(0);
    });

    it('is the list length for identical lists', () => {
        expect(intersectionSizeOf(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(3);
    });

    it('counts partial overlap', () => {
        expect(intersectionSizeOf(['a', 'b', 'c'], ['b', 'c', 'd'])).toBe(2);
    });

    it('is 0 when either list is empty', () => {
        expect(intersectionSizeOf([], ['a'])).toBe(0);
        expect(intersectionSizeOf(['a'], [])).toBe(0);
    });

    it('counts shared suffixed duplicates as separate intersection members', () => {
        // Both share 'a' and 'a+' → intersection size 2.
        expect(intersectionSizeOf(['a', 'a+', 'b'], ['a', 'a+', 'c'])).toBe(2);
    });
});

describe('jaccardSimilarity', () => {
    it('is 1 for identical sets', () => {
        expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
    });

    it('is 0 for disjoint sets', () => {
        expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
    });

    it('is |A∩B| / |A∪B| for partial overlap', () => {
        // {a,b,c} ∩ {b,c,d} = {b,c} (size 2); union = {a,b,c,d} (size 4) → 0.5
        expect(jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd'])).toBe(0.5);
    });
});
