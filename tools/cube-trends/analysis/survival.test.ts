import { describe, it, expect } from 'vitest';
import { makeContext, makeCardInfo } from './fixtures';
import { analyzeSurvival } from './survival';

const DAY = 86_400_000;
const flatWeighting = { weighting: { recency: false, dedupe: false } };

describe('analyzeSurvival', () => {
    it('ends a spell at the removal revision and censors a never-removed card at the last sample', () => {
        const samples = [0, 10 * DAY, 20 * DAY];
        const cubes = [
            {
                id: 'a',
                revisions: [
                    { id: 'a-0', date: 0, cards: ['bolt', 'shock'], addedAt: { bolt: -100 * DAY, shock: 0 } },
                    { id: 'a-1', date: 10 * DAY, cards: ['bolt', 'shock'] },
                    { id: 'a-2', date: 20 * DAY, cards: ['shock'] },
                ],
                grid: ['a-0', 'a-1', 'a-2'],
            },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const result = analyzeSurvival(ctx);

        if ('empty' in result) {
            throw new Error('expected a non-empty result');
        }

        expect(result.spells).toBe(2);
        // bolt: added 100d before window start, removed at day 20 -> duration 120, event
        // shock: present at window start, still present at last sample -> censored (no KM point, but counted in the risk set)
        expect(result.overall).toEqual([{ t: 0, s: 1 }, { t: 120, s: 0 }]);
    });

    it('splits spells into new vs established by eligibility relative to the survivalNewCardMonths threshold', () => {
        const windowStart = 1000 * DAY;
        const samples = [windowStart, windowStart + 10 * DAY];
        const cubes = [
            {
                id: 'a',
                revisions: [
                    { id: 'a-0', date: windowStart, cards: ['fresh', 'veteran'] },
                    { id: 'a-1', date: windowStart + 10 * DAY, cards: [] },
                ],
                grid: ['a-0', 'a-1'],
            },
        ];
        const cardInfo = [
            makeCardInfo('fresh', { eligibility: { date: windowStart - 30 * DAY, setCode: 'aaa', fallback: false } }),
            makeCardInfo('veteran', { eligibility: { date: windowStart - 400 * DAY, setCode: 'bbb', fallback: false } }),
        ];

        const ctx = makeContext({ samples, cubes, cardInfo, config: flatWeighting });
        const result = analyzeSurvival(ctx);

        if ('empty' in result) {
            throw new Error('expected a non-empty result');
        }

        expect(result.spells).toBe(2);
        expect(result.overall).toEqual([{ t: 0, s: 1 }, { t: 10, s: 0 }]);
        expect(result.newCards).toEqual([{ t: 0, s: 1 }, { t: 10, s: 0 }]);
        expect(result.established).toEqual([{ t: 0, s: 1 }, { t: 10, s: 0 }]);
    });

    it('enters left-truncated spells into the risk set at the first observing sample', () => {
        const samples = [0, 10 * DAY, 20 * DAY];
        const cubes = [
            {
                id: 'a',
                revisions: [
                    { id: 'a-0', date: 0, cards: ['old', 'fresh', 'stay'], addedAt: { old: -90 * DAY, fresh: 0, stay: 0 } },
                    { id: 'a-1', date: 10 * DAY, cards: ['old', 'stay'] },
                    { id: 'a-2', date: 20 * DAY, cards: ['stay'] },
                ],
                grid: ['a-0', 'a-1', 'a-2'],
            },
        ];

        const result = analyzeSurvival(makeContext({ samples, cubes, config: flatWeighting }));
        if ('empty' in result) {
            throw new Error('expected a non-empty result');
        }

        // old (entry 90, removed at 110) is not at risk at t=10: S(10) = 1 - 1/2
        expect(result.overall).toEqual([{ t: 0, s: 1 }, { t: 10, s: 0.5 }, { t: 110, s: 0 }]);
    });

    it('returns empty when there are no card spells in the sampled window', () => {
        const samples = [0];
        const cubes = [
            { id: 'a', revisions: [{ id: 'a-0', date: 0, cards: [] }], grid: ['a-0'] },
        ];

        const ctx = makeContext({ samples, cubes, config: flatWeighting });
        const result = analyzeSurvival(ctx);

        expect(result).toEqual({ empty: true, reason: 'No card spells in the sampled window.' });
    });
});
