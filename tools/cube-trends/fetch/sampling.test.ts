import { describe, it, expect } from 'vitest';
import { sampleDates, alignAnchor, GRID_EPOCH, DAY } from './sampling';

const WEEK = 7 * DAY;

describe('sampleDates', () => {
    it('builds a descending-to-ascending anchor grid', () => {
        const dates = sampleDates(Date.UTC(2026, 9, 3, 15), 14 * DAY, 28 * DAY);
        expect(dates).toEqual([Date.UTC(2026, 8, 5), Date.UTC(2026, 8, 19), Date.UTC(2026, 9, 3)]);
    });

    it('yields identical arrays for any now within the same epoch-aligned week', () => {
        const range = 21 * DAY;
        const base = sampleDates(Date.UTC(2026, 9, 3), WEEK, range);
        expect(sampleDates(Date.UTC(2026, 9, 4, 12), WEEK, range)).toEqual(base);
        expect(sampleDates(Date.UTC(2026, 9, 9, 23, 59, 59, 999), WEEK, range)).toEqual(base);
    });

    it('adds the new weekly sample and drops the oldest once now rolls into the next aligned week', () => {
        const range = 21 * DAY;
        const base = sampleDates(Date.UTC(2026, 9, 3), WEEK, range);
        const rolled = sampleDates(Date.UTC(2026, 9, 10), WEEK, range);
        expect(rolled).toEqual([...base.slice(1), Date.UTC(2026, 9, 10)]);
    });

    it('contains every 2-week sample date within the 1-week samples for the same now/range', () => {
        const range = 84 * DAY;
        const weekly = sampleDates(GRID_EPOCH, WEEK, range);
        const biweekly = sampleDates(GRID_EPOCH, 14 * DAY, range);
        for (const d of biweekly) {
            expect(weekly).toContain(d);
        }
    });
});

describe('alignAnchor', () => {
    it('floors correctly for a t before the epoch', () => {
        expect(alignAnchor(Date.UTC(2026, 9, 2), WEEK)).toBe(Date.UTC(2026, 8, 26));
    });
});
