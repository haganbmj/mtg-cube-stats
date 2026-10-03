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
});
