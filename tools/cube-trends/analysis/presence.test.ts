import { describe, it, expect } from 'vitest';
import { makeContext, makeCardInfo } from './fixtures';
import { analyzeCards } from './cards';
import { analyzeChurn } from './churn';
import { analyzeTimeline } from './timeline';
import { analyzeSurvival } from './survival';
import { analyzeSets } from './sets';

const DAY = 86_400_000;

// A cube that picks up a second Bolt and later drops it again; Shock is a genuine add.
function duplicateFixture() {
    const samples = [0, 10 * DAY, 20 * DAY];
    const cubes = [
        {
            id: 'a',
            revisions: [
                { id: 'a-0', date: 0, cards: ['bolt', 'zap'] },
                { id: 'a-1', date: 10 * DAY, cards: ['bolt', 'bolt+', 'zap', 'shock'] },
                { id: 'a-2', date: 20 * DAY, cards: ['bolt', 'zap', 'shock'] },
            ],
            grid: ['a-0', 'a-1', 'a-2'],
        },
    ];
    const cardInfo = [
        makeCardInfo('bolt', { eligibility: { date: -10 * DAY, setCode: 'aaa', fallback: false } }),
        makeCardInfo('zap', { eligibility: { date: -10 * DAY, setCode: 'aaa', fallback: false } }),
        makeCardInfo('shock', { eligibility: { date: -400 * DAY, setCode: 'old', fallback: false } }),
    ];
    const sets = [{ code: 'aaa', name: 'Set A', releasedAt: 0 }];
    return makeContext({ samples, cubes, cardInfo, sets, config: { weighting: { recency: false, dedupe: false } } });
}

describe('presence-based analyses ignore extra copies', () => {
    it('emits one card trend per card', () => {
        const { cards } = analyzeCards(duplicateFixture());
        expect(cards.map((c) => c.key).sort()).toEqual(['bolt', 'shock', 'zap']);
        expect(cards[0]).not.toHaveProperty('copy');
    });

    it('counts only cards entering or leaving a cube as churn', () => {
        const [cube] = analyzeChurn(duplicateFixture()).cubes;
        expect(cube.adds).toEqual([0, 1, 0]);
        expect(cube.removes).toEqual([0, 0, 0]);
        // 1 change over 3 distinct cards
        expect(cube.rate[1]).toBeCloseTo(1 / 6);
    });

    it('counts timeline adds/removes and age shares per card', () => {
        const { points } = analyzeTimeline(duplicateFixture());
        expect(points.map((p) => [p.adds, p.removes])).toEqual([[0, 0], [1, 0], [0, 0]]);
        // bolt + zap are under 3 months old, shock is not: 2 of 3 cards
        expect(points[1].shareUnder.m3).toBeCloseTo(2 / 3);
    });

    it('builds survival spells per card', () => {
        const result = analyzeSurvival(duplicateFixture());
        if ('empty' in result) {
            throw new Error('expected a non-empty result');
        }
        expect(result.spells).toBe(3);
    });

    it('measures set adoption as distinct cards per cube', () => {
        const { adoption } = analyzeSets(duplicateFixture());
        expect(adoption[0].curve.map((p) => p.value)).toEqual([2, 2, 2]);
    });
});
