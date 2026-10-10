import { describe, it, expect } from 'vitest';
import { makeContext, makeCardInfo } from './fixtures';
import { analyzeTimeline } from './timeline';

const DAY = 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeTimeline', () => {
    it('computes weighted median age and share-under buckets from two equal-weight cubes', () => {
        const t = 1000 * DAY;
        const samples = [t];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: t, cards: ['young'] }], grid: ['a-0'] },
            { id: 'b', revisions: [{ id: 'b-0', date: t, cards: ['old'] }], grid: ['b-0'] },
        ];
        const cardInfo = [
            makeCardInfo('young', { eligibility: { date: t - 30 * DAY, setCode: 'aaa', fallback: false } }),
            makeCardInfo('old', { eligibility: { date: t - 400 * DAY, setCode: 'bbb', fallback: false } }),
        ];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting });
        const { points } = analyzeTimeline(ctx);

        expect(points[0].agePercentiles!.p50).toBe(30);
        expect(points[0].shareUnder.m3).toBe(0.5);
        expect(points[0].shareUnder.m12).toBe(0.5);
    });

    it('computes 10th/25th/50th/75th/90th age percentiles, null when no cards have ages', () => {
        const t = 1000 * DAY;
        const keys = Array.from({ length: 10 }, (_, i) => `c${i + 1}`);
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: t, cards: keys }], grid: ['a-0', 'a-0'] },
        ];
        const cardInfo = keys.map((key, i) => makeCardInfo(key, { eligibility: { date: t - (i + 1) * 10 * DAY, setCode: 'aaa', fallback: false } }));

        const { points } = analyzeTimeline(makeContext({ samples: [t, t], cubes, cardInfo, config: flatWeighting }));
        expect(points[0].agePercentiles).toEqual({ p10: 10, p25: 30, p50: 50, p75: 80, p90: 90 });

        const bare = analyzeTimeline(makeContext({ samples: [0], cubes: [{ id: 'a', revisions: [{ id: 'a-0', date: 0, cards: ['x'] }], grid: ['a-0'] }], config: flatWeighting }));
        expect(bare.points[0].agePercentiles).toBeNull();
    });

    it('returns null homogenization with fewer than two present cubes', () => {
        const samples = [0];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: 0, cards: ['bolt'] }], grid: ['a-0'] },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { points } = analyzeTimeline(ctx);

        expect(points[0].homogenization).toBeNull();
    });

    it('counts a diff event at the sample it lands in, not the prior one', () => {
        const samples = [0, 10 * DAY, 20 * DAY];
        const cubes = [
            {
                id: 'a',
                revisions: [
                    { id: 'a-0', date: 0, cards: [] },
                    { id: 'a-1', date: 10 * DAY, cards: [] },
                    { id: 'a-2', date: 20 * DAY, cards: ['bolt'] },
                ],
                grid: ['a-0', 'a-1', 'a-2'],
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { points } = analyzeTimeline(ctx);

        expect(points[0].adds).toBe(0);
        expect(points[1].adds).toBe(0);
        expect(points[2].adds).toBe(1);
        expect(points[2].removes).toBe(0);
    });

    it('computes numeric homogenization for three cubes', () => {
        const t = 1000 * DAY;
        const samples = [t];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: t, cards: ['x', 'y'] }], grid: ['a-0'] },
            { id: 'b', revisions: [{ id: 'b-0', date: t, cards: ['x', 'z'] }], grid: ['b-0'] },
            { id: 'c', revisions: [{ id: 'c-0', date: t, cards: ['w', 'v'] }], grid: ['c-0'] },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const { points } = analyzeTimeline(ctx);

        expect(points[0].homogenization).not.toBeNull();
        expect(points[0].homogenization!.mean).toBeCloseTo(1 / 6);
        expect(points[0].homogenization!.weightedMean).toBeCloseTo(1 / 6);
        expect(points[0].homogenization!.q1).toBe(0);
        expect(points[0].homogenization!.median).toBe(0);
        expect(points[0].homogenization!.q3).toBe(0.5);
    });
});
