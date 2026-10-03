import type { Ms } from '../types';

export const DAY: Ms = 86_400_000;

export function sampleDates(now: Ms, intervalMs: number, rangeMs: number): Ms[] {
    const anchor = Math.floor(now / DAY) * DAY;
    const steps = Math.floor(rangeMs / intervalMs);
    const dates: Ms[] = [];
    for (let k = steps; k >= 0; k -= 1) {
        dates.push(anchor - k * intervalMs);
    }
    return dates;
}
