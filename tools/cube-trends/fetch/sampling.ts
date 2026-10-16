import type { Ms } from '../types';

export const DAY: Ms = 86_400_000;

// Saturday; the first fetched coverage grid is aligned to it. Keeping this fixed lets any
// interval's sample dates land on a shared grid, so finer intervals reuse coarser coverage.
export const GRID_EPOCH: Ms = Date.UTC(2026, 9, 3);

export function alignAnchor(t: Ms, intervalMs: number): Ms {
    return GRID_EPOCH + Math.floor((t - GRID_EPOCH) / intervalMs) * intervalMs;
}

export function sampleDates(now: Ms, intervalMs: number, rangeMs: number): Ms[] {
    const anchor = alignAnchor(now, intervalMs);
    const steps = Math.floor(rangeMs / intervalMs);
    const dates: Ms[] = [];
    for (let k = steps; k >= 0; k -= 1) {
        dates.push(anchor - k * intervalMs);
    }
    return dates;
}
