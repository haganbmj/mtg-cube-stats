import { describe, it, expect } from 'vitest';
import { mergeSimilarityMatrices } from './CubeFunctions';
import type { SimilarityMatrix, SimilarityScore } from '../types';

const score = (n: number): SimilarityScore => ({ cosineSimilarity: n, insersectionSize: 0 });

describe('mergeSimilarityMatrices', () => {
    it('returns empty for two empty inputs', () => {
        expect(mergeSimilarityMatrices({}, {})).toEqual({});
    });

    it('returns incoming when existing is empty', () => {
        const incoming: SimilarityMatrix = { a: { b: score(0.5) } };
        expect(mergeSimilarityMatrices({}, incoming)).toEqual(incoming);
    });

    it('returns existing when incoming is empty', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        expect(mergeSimilarityMatrices(existing, {})).toEqual(existing);
    });

    it('unions disjoint outer keys', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        const incoming: SimilarityMatrix = { c: { d: score(0.7) } };
        expect(mergeSimilarityMatrices(existing, incoming)).toEqual({
            a: { b: score(0.5) },
            c: { d: score(0.7) },
        });
    });

    it('merges rows for overlapping outer keys with disjoint inner keys', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        const incoming: SimilarityMatrix = { a: { c: score(0.7) } };
        expect(mergeSimilarityMatrices(existing, incoming)).toEqual({
            a: { b: score(0.5), c: score(0.7) },
        });
    });

    it('incoming wins for overlapping inner keys', () => {
        const existing: SimilarityMatrix = { a: { b: score(0.5) } };
        const incoming: SimilarityMatrix = { a: { b: score(0.9) } };
        expect(mergeSimilarityMatrices(existing, incoming)).toEqual({
            a: { b: score(0.9) },
        });
    });
});
