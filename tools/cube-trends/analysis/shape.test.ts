import { describe, it, expect } from 'vitest';
import { makeContext, makeCardInfo } from './fixtures';
import { analyzeShape } from './shape';

const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeShape', () => {
    it('computes weighted color/size/MV bands from two equal-weight cubes, excluding lands from MV stats', () => {
        const t = 0;
        const samples = [t];
        const cubes = [
            {
                id: 'a',
                revisions: [{ id: 'a-0', date: t, cards: ['r1', 'r2', 'b1', 'b2', 'land1'] }],
                grid: ['a-0'],
            },
            {
                id: 'b',
                revisions: [{ id: 'b-0', date: t, cards: ['r3', 'r4'] }],
                grid: ['b-0'],
            },
        ];
        const cardInfo = [
            makeCardInfo('r1', { colorCategory: 'R', cmc: 1 }),
            makeCardInfo('r2', { colorCategory: 'R', cmc: 2 }),
            makeCardInfo('b1', { colorCategory: 'U', cmc: 1 }),
            makeCardInfo('b2', { colorCategory: 'U', cmc: 3 }),
            makeCardInfo('land1', { colorCategory: 'L', primaryType: 'Land', cmc: 0 }),
            makeCardInfo('r3', { colorCategory: 'R', cmc: 1 }),
            makeCardInfo('r4', { colorCategory: 'R', cmc: 2 }),
        ];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting });
        const { points, types } = analyzeShape(ctx);

        expect(points).toHaveLength(1);
        const point = points[0];

        // cube A: 2/5 red, cube B: 2/2 red -> shares [0.4, 1.0]
        expect(point.color.R).toEqual({ q1: 0.4, median: 0.4, q3: 1 });
        // all 8 ColorCategory keys always present, even when no cube has that color
        expect(point.color.G).toEqual({ q1: 0, median: 0, q3: 0 });

        // size = non-null copy-key counts: cube A 5, cube B 2
        expect(point.size).toEqual({ q1: 2, median: 2, q3: 5 });

        // meanMv excludes land: cube A mean = (1+2+1+3)/4 = 1.75, cube B mean = (1+2)/2 = 1.5
        expect(point.meanMv).toEqual({ q1: 1.5, median: 1.5, q3: 1.75 });

        // land's cmc 0 is excluded entirely, so bucket '0' stays at zero for both cubes
        expect(point.mvHistogram['0']).toEqual({ q1: 0, median: 0, q3: 0 });
        // bucket '1': cube A has 2 (r1, b1), cube B has 1 (r3)
        expect(point.mvHistogram['1']).toEqual({ q1: 1, median: 1, q3: 2 });

        expect(types).toContain('Land');
        expect(types).toEqual([...types].sort());
    });

    it('returns zero bands with no NaNs when no cube is present at a sample', () => {
        const samples = [0, 10];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: 0, cards: ['r1'] }], grid: ['a-0', null] },
        ];
        const cardInfo = [makeCardInfo('r1', { colorCategory: 'R', cmc: 1 })];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting });
        const { points } = analyzeShape(ctx);

        expect(points[1].size).toEqual({ q1: 0, median: 0, q3: 0 });
        expect(points[1].color.R).toEqual({ q1: 0, median: 0, q3: 0 });
        expect(points[1].meanMv).toEqual({ q1: 0, median: 0, q3: 0 });
    });
});
