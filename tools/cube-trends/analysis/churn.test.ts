import { describe, it, expect } from 'vitest';
import { makeContext } from './fixtures';
import { analyzeChurn } from './churn';

const DAY = 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeChurn', () => {
    it('computes rate as (adds + removes) / (2 * size) for the interval ending at the sample', () => {
        const base = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
        const after = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'n1', 'n2'];
        const samples = [0, 10 * DAY];
        const cubes = [
            {
                id: 'a',
                revisions: [
                    { id: 'a-0', date: 0, cards: base },
                    { id: 'a-1', date: 10 * DAY, cards: after },
                ],
                grid: ['a-0', 'a-1'],
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cubes: churns, community } = analyzeChurn(ctx);

        expect(churns[0].rate[0]).toBeNull();
        expect(churns[0].rate[1]).toBeCloseTo(0.2);
        expect(churns[0].adds[0]).toBe(0);
        expect(churns[0].removes[0]).toBe(0);
        expect(churns[0].adds[1]).toBe(2);
        expect(churns[0].removes[1]).toBe(2);
        expect(churns[0].totalAdds).toBe(2);
        expect(churns[0].totalRemoves).toBe(2);
        expect(churns[0].meanRate).toBeCloseTo(0.2);
        expect(community.rate[0]).toBeNull();
        expect(community.rate[1]).toBeCloseTo(0.2);
    });

    it('is null when the cube is absent or its revision is empty, and sorts cubes by total churn desc', () => {
        const samples = [0, 10 * DAY];
        const cubes = [
            {
                id: 'quiet',
                revisions: [
                    { id: 'q-0', date: 0, cards: ['bolt'] },
                    { id: 'q-1', date: 10 * DAY, cards: ['bolt', 'shock'] },
                ],
                grid: ['q-0', 'q-1'],
            },
            {
                id: 'busy',
                revisions: [
                    { id: 'b-0', date: 0, cards: ['a', 'b'] },
                    { id: 'b-1', date: 10 * DAY, cards: ['c', 'd'] },
                ],
                grid: ['b-0', 'b-1'],
            },
            {
                id: 'gone',
                revisions: [
                    { id: 'g-0', date: 0, cards: [] },
                ],
                grid: ['g-0', null],
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cubes: churns } = analyzeChurn(ctx);

        const gone = churns.find((c) => c.cubeId === 'gone')!;
        expect(gone.rate[1]).toBeNull();

        expect(churns.map((c) => c.cubeId)).toEqual(['busy', 'quiet', 'gone']);
    });

    it('returns meanRate 0 when every sample rate is null', () => {
        const samples = [0];
        const cubes = [
            { id: 'solo', revisions: [{ id: 's-0', date: 0, cards: ['bolt'] }], grid: ['s-0'] },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { cubes: churns } = analyzeChurn(ctx);

        expect(churns[0].meanRate).toBe(0);
    });
});
