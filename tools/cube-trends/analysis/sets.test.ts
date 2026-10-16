import { describe, it, expect } from 'vitest';
import { makeContext, makeCardInfo } from './fixtures';
import { analyzeSets } from './sets';

const WEEK = 7 * 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeSets', () => {
    it('builds an adoption curve peaking after the cube adds both set cards, falling after a removal', () => {
        const samples = [0, WEEK * 2, WEEK * 4, WEEK * 6, WEEK * 8];
        const releasedAt = samples[1];

        const cubes = [
            {
                id: 'c1',
                revisions: [
                    { id: 'r0', date: samples[0], cards: [] },
                    { id: 'r1', date: samples[1], cards: [] },
                    { id: 'r2', date: samples[2], cards: ['cardA', 'cardB'] },
                    { id: 'r3', date: samples[3], cards: ['cardA', 'cardB'] },
                    { id: 'r4', date: samples[4], cards: ['cardA'] },
                ],
                grid: ['r0', 'r1', 'r2', 'r3', 'r4'],
            },
        ];

        const cardInfo = [
            makeCardInfo('cardA', { eligibility: { date: 0, setCode: 'SET', fallback: false } }),
            makeCardInfo('cardB', { eligibility: { date: 0, setCode: 'SET', fallback: false } }),
        ];

        const sets = [{ code: 'SET', name: 'Test Set', releasedAt }];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting, sets });
        const { adoption } = analyzeSets(ctx);

        expect(adoption).toHaveLength(1);
        expect(adoption[0].cardCount).toBe(2);
        expect(adoption[0].curve.map((p) => p.value)).toEqual([0, 2, 2, 1]);
        expect(adoption[0].peak).toBe(2);
        expect(adoption[0].timeToPeakWeeks).toBe(2);
        expect(adoption[0].retention).toBeNull();
    });

    it('omits a set from adoption when fewer than setMinCards cards are ever attributed to it', () => {
        const samples = [0, WEEK * 2];
        const releasedAt = samples[0];

        const cubes = [
            { id: 'c1', revisions: [{ id: 'r0', date: samples[0], cards: ['cardA'] }, { id: 'r1', date: samples[1], cards: ['cardA'] }], grid: ['r0', 'r1'] },
        ];

        const cardInfo = [
            makeCardInfo('cardA', { eligibility: { date: 0, setCode: 'LONE', fallback: false } }),
        ];

        const sets = [{ code: 'LONE', name: 'Lone Set', releasedAt }];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting, sets });
        const { adoption } = analyzeSets(ctx);

        expect(adoption).toHaveLength(0);
    });

    it('gives red instants removed just after release a lift above 1 vs. the whole-panel baseline', () => {
        const samples = Array.from({ length: 20 }, (_, i) => i * WEEK);
        const releasedAt = samples[5];

        const cubes = [
            {
                id: 'c1',
                revisions: [
                    { id: 'before', date: samples[0], cards: ['i1', 'i2', 'i3', 'i4'] },
                    { id: 'after', date: samples[6], cards: ['i4'] },
                ],
                grid: [
                    'before', 'before', 'before', 'before', 'before', 'before',
                    'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after', 'after',
                ],
            },
        ];

        const sets = [{ code: 'NEO', name: 'Kamigawa: Neon Dynasty', releasedAt }];

        const ctx = makeContext({ samples, cubes, config: flatWeighting, sets });
        const { displacement } = analyzeSets(ctx);

        expect(displacement).toHaveLength(1);
        const redInstants = displacement[0].groups.find((g) => g.colorCategory === 'R' && g.primaryType === 'Instant');
        expect(redInstants).toBeDefined();
        expect(redInstants!.removals).toBe(3);
        expect(redInstants!.lift).toBeGreaterThan(1);
        expect(displacement[0].topCards).toEqual([
            { key: 'i1', removals: 1 },
            { key: 'i2', removals: 1 },
            { key: 'i3', removals: 1 },
        ]);
        expect(displacement[0].partial).toBe(false);
    });

    it('clamps the displacement window to the last sample and scales expected by the observed length', () => {
        const samples = Array.from({ length: 20 }, (_, i) => i * WEEK);
        const releasedAt = samples[17];

        const cubes = [
            {
                id: 'c1',
                revisions: [
                    { id: 'before', date: samples[0], cards: ['i1', 'i2', 'i3', 'i4'] },
                    { id: 'after', date: samples[18], cards: ['i4'] },
                ],
                grid: [...Array(18).fill('before'), 'after', 'after'],
            },
        ];
        const sets = [{ code: 'NEW', name: 'New Set', releasedAt }];

        const { displacement } = analyzeSets(makeContext({ samples, cubes, config: flatWeighting, sets }));

        expect(displacement[0].partial).toBe(true);
        const redInstants = displacement[0].groups.find((g) => g.colorCategory === 'R' && g.primaryType === 'Instant')!;
        // baseline 3 removals / 19 weeks, observed window 2 of 8 weeks
        expect(redInstants.expected).toBeCloseTo((3 / 19) * 2);
        expect(redInstants.lift).toBeCloseTo(19 / 2);
    });

    it('excludes a set from adoption when attributed cards exist only in off-grid revisions', () => {
        const samples = [0, WEEK * 2];
        const releasedAt = samples[0];

        const cubes = [
            {
                id: 'c1',
                revisions: [
                    { id: 'r0', date: samples[0], cards: ['cardA'] },
                    { id: 'r1', date: samples[1], cards: ['cardA'] },
                    { id: 'offgrid', date: samples[1], cards: ['cardB'] }, // off-grid revision
                ],
                grid: ['r0', 'r1'], // only r0 and r1 in grid; offgrid revision not referenced
            },
        ];

        const cardInfo = [
            makeCardInfo('cardA', { eligibility: { date: 0, setCode: 'HYBRID', fallback: false } }),
            makeCardInfo('cardB', { eligibility: { date: 0, setCode: 'HYBRID', fallback: false } }),
        ];

        const sets = [{ code: 'HYBRID', name: 'Hybrid Set', releasedAt }];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting, sets });
        const { adoption } = analyzeSets(ctx);

        // Set should be absent because only cardA (from grid) counts toward cardCount;
        // cardB from the off-grid revision is not included, so cardCount=1 < setMinCards=2.
        expect(adoption).toHaveLength(0);
    });

    it('counts top additions within the displacement window and flags set-eligible ones', () => {
        const samples = Array.from({ length: 20 }, (_, i) => i * WEEK);
        const releasedAt = samples[5];

        const cubes = [
            {
                id: 'c1',
                revisions: [
                    { id: 'r0', date: samples[0], cards: [] },
                    { id: 'r1', date: samples[6], cards: ['new1', 'new3'] },
                    { id: 'r2', date: samples[15], cards: ['new1', 'new3', 'new2'] },
                ],
                grid: [...Array(6).fill('r0'), ...Array(9).fill('r1'), ...Array(5).fill('r2')],
            },
        ];

        const cardInfo = [
            makeCardInfo('new1', { eligibility: { date: 0, setCode: 'NEO', fallback: false } }),
        ];

        const sets = [{ code: 'NEO', name: 'Kamigawa: Neon Dynasty', releasedAt }];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting, sets });
        const { displacement } = analyzeSets(ctx);

        // new2 is added at samples[15], past the 8-week window end (samples[13]), so it's excluded.
        expect(displacement[0].topAdded).toEqual([
            { key: 'new1', additions: 1, fromSet: true },
            { key: 'new3', additions: 1, fromSet: false },
        ]);
    });
});

describe('analyzeSets set trends', () => {
    const DAY = 86_400_000;
    const samples = [0, 30 * DAY, 60 * DAY, 90 * DAY];
    // Cube a swaps 'old' cards for 'new' ones (and picks up an extra copy, which is ignored); cube b never changes.
    const cubes = [
        {
            id: 'a',
            revisions: [
                { id: 'a0', date: samples[0], cards: ['x1', 'o1', 'o2', 'o3'] },
                { id: 'a1', date: samples[1], cards: ['x1', 'x2', 'o1', 'o2'] },
                { id: 'a2', date: samples[2], cards: ['x1', 'x2', 'x3', 'o1'] },
                { id: 'a3', date: samples[3], cards: ['x1', 'x2', 'x3', 'x3+', 'o1'] },
            ],
            grid: ['a0', 'a1', 'a2', 'a3'],
        },
        {
            id: 'b',
            revisions: [{ id: 'b0', date: samples[0], cards: ['o1', 'o2'] }],
            grid: ['b0', 'b0', 'b0', 'b0'],
        },
    ];
    const elig = (setCode: string) => ({ eligibility: { date: 0, setCode, fallback: false } });
    const cardInfo = [
        makeCardInfo('x1', elig('new')), makeCardInfo('x2', elig('new')), makeCardInfo('x3', elig('new')),
        makeCardInfo('o1', elig('old')), makeCardInfo('o2', elig('old')), makeCardInfo('o3', elig('old')),
    ];
    const sets = [
        { code: 'new', name: 'New Set', releasedAt: 0 },
        { code: 'old', name: 'Old Set', releasedAt: -1000 * DAY },
    ];

    it('tracks distinct cards per cube and share of cube cards for every set', () => {
        const { trends } = analyzeSets(makeContext({ samples, cubes, cardInfo, sets, config: flatWeighting }));
        const byCode = new Map(trends.map((t) => [t.code, t]));

        const next = byCode.get('new')!;
        expect(next.name).toBe('New Set');
        expect(next.cardCount).toBe(3);
        expect(next.perCube.values).toEqual([0.5, 1, 1.5, 1.5]);
        expect(next.share.values).toEqual([0.125, 0.25, 0.375, 0.375]);
        expect(next.perCube.current).toBe(1.5);
        expect(next.perCube.delta).toBe(1);
        expect(next.share.delta).toBe(0.25);
        expect(next.perCube.momentum).toBeGreaterThan(0);
        expect(next.share.momentum).toBeGreaterThan(0);

        const old = byCode.get('old')!;
        expect(old.perCube.values).toEqual([2.5, 2, 1.5, 1.5]);
        expect(old.share.values).toEqual([0.875, 0.75, 0.625, 0.625]);
        expect(old.perCube.momentum).toBeLessThan(0);
    });

    it('omits momentum for sets that never reach the minimum cards per cube', () => {
        const sparse = [{ id: 'a', revisions: [{ id: 'a0', date: 0, cards: ['x1', 'x2', 'o1'] }], grid: ['a0', 'a0', 'a0', 'a0'] },
            { id: 'b', revisions: [{ id: 'b0', date: 0, cards: ['o1'] }], grid: ['b0', 'b0', 'b0', 'b0'] },
            { id: 'c', revisions: [{ id: 'c0', date: 0, cards: ['o1'] }], grid: ['c0', 'c0', 'c0', 'c0'] },
            { id: 'd', revisions: [{ id: 'd0', date: 0, cards: ['o1'] }], grid: ['d0', 'd0', 'd0', 'd0'] },
            { id: 'e', revisions: [{ id: 'e0', date: 0, cards: ['o1'] }], grid: ['e0', 'e0', 'e0', 'e0'] }];
        const { trends } = analyzeSets(makeContext({ samples, cubes: sparse, cardInfo, sets, config: flatWeighting }));
        // 2 cards across 5 cubes = 0.4 cards per cube, below the 0.5 floor
        const next = trends.find((t) => t.code === 'new')!;
        expect(next.perCube.peak).toBeCloseTo(0.4);
        expect(next.perCube.momentum).toBeNull();
        expect(next.share.momentum).toBeNull();
        expect(next.perCube.delta).toBe(0);
    });
});
