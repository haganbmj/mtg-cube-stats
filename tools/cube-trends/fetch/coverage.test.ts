import { describe, it, expect } from 'vitest';
import { emptyIndex, resolveAt, addCoverage, uncoveredSamples } from './coverage';

describe('resolveAt', () => {
    const index = {
        ...emptyIndex('cube1', 0),
        coverage: [{ id: 'b', from: 100, to: 200 }, { id: 'a', from: 10, to: 50 }],
    };

    it('resolves to the covering revision id', () => {
        expect(resolveAt(index, 150)).toBe('b');
        expect(resolveAt(index, 50)).toBe('a');
    });

    it('returns undefined when no interval covers t and createdAfter is null', () => {
        expect(resolveAt(index, 75)).toBeUndefined();
        expect(resolveAt(index, 5)).toBeUndefined();
    });

    it('returns null when t is before createdAfter', () => {
        const indexWithCreatedAfter = { ...index, createdAfter: 8 };
        expect(resolveAt(indexWithCreatedAfter, 5)).toBeNull();
    });
});

describe('addCoverage', () => {
    it('unions overlapping intervals with the same id and clears covered gaps', () => {
        const base = { ...emptyIndex('cube1', 0), coverage: [{ id: 'x', from: 100, to: 200 }], gaps: [95] };
        const result = addCoverage(base, 'x', 90, 120);
        expect(result.coverage).toEqual([{ id: 'x', from: 90, to: 200 }]);
        expect(result.gaps).toEqual([]);
    });

    it('does not mutate the input index', () => {
        const base = { ...emptyIndex('cube1', 0), coverage: [{ id: 'x', from: 100, to: 200 }] };
        addCoverage(base, 'x', 90, 120);
        expect(base.coverage).toEqual([{ id: 'x', from: 100, to: 200 }]);
    });
});

describe('uncoveredSamples', () => {
    it('returns descending samples that are not resolvable', () => {
        const index = {
            ...emptyIndex('cube1', 0),
            coverage: [{ id: 'a', from: 100, to: 200 }],
        };
        const samples = [50, 150, 300];
        expect(uncoveredSamples(index, samples)).toEqual([300, 50]);
    });

    it('excludes samples that resolve to null (before createdAfter) and covered samples', () => {
        const index = {
            ...emptyIndex('cube1', 0),
            createdAfter: 50,
            coverage: [{ id: 'a', from: 100, to: 200 }],
        };
        const samples = [10, 75, 150];
        expect(uncoveredSamples(index, samples)).toEqual([75]);
    });
});
