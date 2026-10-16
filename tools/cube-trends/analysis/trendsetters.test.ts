import { describe, it, expect } from 'vitest';
import { makeCardInfo, makeContext } from './fixtures';
import { analyzeTrendsetters } from './trendsetters';

const DAY = 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeTrendsetters', () => {
    it('ranks adopters by date into percentiles and sorts cubes by mean percentile', () => {
        const cards = ['p1', 'p2', 'p3', 'p4', 'p5'];
        const samples = [0, DAY, 2 * DAY, 3 * DAY];
        const cubes = ['A', 'B', 'C'].map((id, i) => ({
            id,
            revisions: [
                { id: `${id}-0`, date: 0, cards: [] },
                { id: `${id}-1`, date: (i + 1) * DAY, cards },
            ],
            grid: [`${id}-0`, `${id}-1`, `${id}-1`, `${id}-1`],
        }));

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const result = analyzeTrendsetters(ctx);

        if ('empty' in result) {
            throw new Error('expected non-empty result');
        }

        expect(result.cubes.map((c) => c.cubeId)).toEqual(['A', 'B', 'C']);
        expect(result.cubes.find((c) => c.cubeId === 'A')!.meanPercentile).toBeCloseTo(0);
        expect(result.cubes.find((c) => c.cubeId === 'B')!.meanPercentile).toBeCloseTo(0.5);
        expect(result.cubes.find((c) => c.cubeId === 'C')!.meanPercentile).toBeCloseTo(1);
        expect(result.cubes.find((c) => c.cubeId === 'A')!.adoptions).toBe(5);
        expect(result.cubes.find((c) => c.cubeId === 'A')!.meanLagDays).toBeNull();
        expect(result.cubes.find((c) => c.cubeId === 'A')!.examples).toHaveLength(5);
    });

    it('measures mean lag only over first-copy adoptions of cards eligible within the window', () => {
        const start = 10 * DAY;
        const old = ['p1', 'p2', 'p3', 'p4', 'p5'];
        const samples = [start, start + DAY, start + 2 * DAY, start + 3 * DAY];
        const cubes = ['A', 'B', 'C'].map((id, i) => ({
            id,
            revisions: [
                { id: `${id}-0`, date: start, cards: [] },
                { id: `${id}-1`, date: start + (i + 1) * DAY, cards: [...old, 'nw', 'nw+'] },
            ],
            grid: [`${id}-0`, `${id}-1`, `${id}-1`, `${id}-1`],
        }));
        const cardInfo = [
            ...old.map((o) => makeCardInfo(o, { eligibility: { date: 0, setCode: 'old', fallback: false } })),
            makeCardInfo('nw', { eligibility: { date: start, setCode: 'new', fallback: false } }),
        ];

        const result = analyzeTrendsetters(makeContext({ samples, cubes, cardInfo, config: flatWeighting }));
        if ('empty' in result) {
            throw new Error('expected non-empty result');
        }

        const byId = (id: string) => result.cubes.find((c) => c.cubeId === id)!;
        expect(byId('A').newCardAdoptions).toBe(1);
        expect(byId('A').meanLagDays).toBeCloseTo(1);
        expect(byId('C').meanLagDays).toBeCloseTo(3);
    });

    it('returns empty with a reason when no cube reaches the adoption threshold', () => {
        const samples = [0, DAY];
        const cubes = [
            {
                id: 'solo',
                revisions: [
                    { id: 's-0', date: 0, cards: [] },
                    { id: 's-1', date: DAY, cards: ['bolt'] },
                ],
                grid: ['s-0', 's-1'],
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const result = analyzeTrendsetters(ctx);

        expect(result).toMatchObject({ empty: true });
        if (!('empty' in result)) {
            throw new Error('expected empty result');
        }
        expect(result.reason).toMatch(/adopt/);
    });
});
