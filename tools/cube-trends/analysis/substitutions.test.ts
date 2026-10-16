import { describe, it, expect } from 'vitest';
import { makeContext, makeCardInfo } from './fixtures';
import { analyzeSubstitutions } from './substitutions';

const DAY = 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeSubstitutions', () => {
    it('pairs a removed card with an added card of the same color and type, ignoring cross-color swaps', () => {
        const samples = [0, DAY];
        const cardInfo = [
            makeCardInfo('merfolk', { colorCategory: 'U', primaryType: 'Creature' }),
            makeCardInfo('elf', { colorCategory: 'G', primaryType: 'Creature' }),
        ];
        const cubes = ['D', 'E', 'F'].map((id) => ({
            id,
            revisions: [
                { id: `${id}-0`, date: 0, cards: ['bolt', 'merfolk'] },
                { id: `${id}-1`, date: DAY, cards: ['shock', 'elf'] },
            ],
            grid: [`${id}-0`, `${id}-1`],
        }));

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting });
        const result = analyzeSubstitutions(ctx);

        if ('empty' in result) {
            throw new Error('expected non-empty result');
        }

        const boltShock = result.pairs.find((p) => p.removed === 'bolt' && p.added === 'shock');
        expect(boltShock).toBeDefined();
        expect(boltShock!.cubes).toBe(3);
        expect(boltShock!.lift).toBeCloseTo(1);

        expect(result.pairs.find((p) => p.removed === 'merfolk' && p.added === 'elf')).toBeUndefined();
    });

    it('counts each revision transition separately rather than once per cube', () => {
        const samples = [0, DAY, 2 * DAY];
        const cardInfo = [
            makeCardInfo('merfolk', { colorCategory: 'U', primaryType: 'Creature' }),
            makeCardInfo('drake', { colorCategory: 'U', primaryType: 'Creature' }),
        ];
        const cubes = ['D', 'E', 'F'].map((id) => ({
            id,
            revisions: [
                { id: `${id}-0`, date: 0, cards: ['bolt', 'merfolk'] },
                { id: `${id}-1`, date: DAY, cards: ['shock', 'merfolk'] },
                { id: `${id}-2`, date: 2 * DAY, cards: ['shock', 'drake'] },
            ],
            grid: [`${id}-0`, `${id}-1`, `${id}-2`],
        }));

        const result = analyzeSubstitutions(makeContext({ samples, cubes, cardInfo, config: flatWeighting }));
        if ('empty' in result) {
            throw new Error('expected non-empty result');
        }

        // n = 6 transitions; bolt->shock in 3 of them: lift = (3/6) / ((3/6)(3/6)) = 2
        const boltShock = result.pairs.find((p) => p.removed === 'bolt' && p.added === 'shock');
        expect(boltShock!.lift).toBeCloseTo(2);
        const merfolkDrake = result.pairs.find((p) => p.removed === 'merfolk' && p.added === 'drake');
        expect(merfolkDrake!.lift).toBeCloseTo(2);
        expect(result.pairs).toHaveLength(2);
    });

    it('returns empty with a reason when no pair reaches the minimum cube count', () => {
        const samples = [0, DAY];
        const cubes = [
            {
                id: 'solo',
                revisions: [
                    { id: 's-0', date: 0, cards: ['bolt'] },
                    { id: 's-1', date: DAY, cards: ['shock'] },
                ],
                grid: ['s-0', 's-1'],
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const result = analyzeSubstitutions(ctx);

        expect(result).toMatchObject({ empty: true });
        if (!('empty' in result)) {
            throw new Error('expected empty result');
        }
        expect(result.reason).toMatch(/cube/);
    });
});
