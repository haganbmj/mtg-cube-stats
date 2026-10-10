import type { Ms } from '../types';
import type { AnalysisContext, SetInfo } from './context';
import type { ColorCategory } from './cardInfo';
import { baseOracleId, copyNumber } from './cardInfo';
import type { DiffEvent } from './diffs';

const WEEK = 7 * 86_400_000;

export interface AdoptionPoint {
    week: number;
    value: number;
}

export interface SetAdoption {
    code: string;
    name: string;
    releasedAt: Ms;
    cardCount: number;
    curve: AdoptionPoint[];
    peak: number;
    timeToPeakWeeks: number;
    retention: number | null;
}

export interface DisplacementGroup {
    colorCategory: ColorCategory;
    primaryType: string;
    removals: number;
    expected: number;
    lift: number;
}

export interface SetDisplacement {
    code: string;
    groups: DisplacementGroup[];
    topCards: { key: string; removals: number }[];
    topAdded: { key: string; additions: number; fromSet: boolean }[];
    // window was clamped to the last sample
    partial: boolean;
}

export interface SetsResult {
    markers: SetInfo[];
    adoption: SetAdoption[];
    displacement: SetDisplacement[];
}

function groupOf(ctx: AnalysisContext, key: string): string | null {
    const info = ctx.panel.cardInfo.get(baseOracleId(key));
    return info ? `${info.colorCategory}|${info.primaryType}` : null;
}

function computeAdoption(ctx: AnalysisContext, marker: SetInfo): SetAdoption | null {
    const { panel, weights, config } = ctx;
    const { samples, grid } = panel;

    // Cards ever attributed to this set, counted only from grid-reachable revisions.
    const attributedBases = new Set<string>();
    for (let c = 0; c < grid.length; c++) {
        for (let k = 0; k < samples.length; k++) {
            const revId = grid[c][k];
            if (revId === null) {
                continue;
            }
            for (const key of panel.revisions.get(revId)!.cards) {
                const base = baseOracleId(key);
                if (panel.cardInfo.get(base)?.eligibility?.setCode === marker.code) {
                    attributedBases.add(base);
                }
            }
        }
    }
    if (attributedBases.size < config.thresholds.setMinCards) {
        return null;
    }

    const curve: AdoptionPoint[] = [];
    for (let k = 0; k < samples.length; k++) {
        const t = samples[k];
        if (t < marker.releasedAt) {
            continue;
        }

        let weightedCount = 0;
        let weightedTotal = 0;
        for (let c = 0; c < grid.length; c++) {
            const revId = grid[c][k];
            if (revId === null) {
                continue;
            }
            const w = weights[c][k];
            weightedTotal += w;
            for (const key of panel.revisions.get(revId)!.cards) {
                if (copyNumber(key) === 1 && attributedBases.has(baseOracleId(key))) {
                    weightedCount += w;
                }
            }
        }

        const value = weightedTotal === 0 ? 0 : weightedCount / weightedTotal;
        curve.push({ week: Math.round((t - marker.releasedAt) / WEEK), value });
    }

    const peak = curve.reduce((max, p) => Math.max(max, p.value), 0);
    const timeToPeakWeeks = curve.find((p) => p.value === peak)!.week;

    const retentionPoint = curve.find((p) => p.week >= config.thresholds.retentionWeeks);
    const retention = !retentionPoint || peak === 0 ? null : retentionPoint.value / peak;

    return {
        code: marker.code,
        name: marker.name,
        releasedAt: marker.releasedAt,
        cardCount: attributedBases.size,
        curve,
        peak,
        timeToPeakWeeks,
        retention,
    };
}

// Per-cube baseline removal rate, split by group, scaled to the displacement window length.
function computeExpectedByGroup(ctx: AnalysisContext, windowLength: number, T: number): Map<string, number> {
    const removalsByCube = new Map<string, DiffEvent[]>();
    for (const event of ctx.diffs) {
        if (event.type !== 'remove') {
            continue;
        }
        const list = removalsByCube.get(event.cubeId) ?? [];
        list.push(event);
        removalsByCube.set(event.cubeId, list);
    }

    const expected = new Map<string, number>();
    for (const events of removalsByCube.values()) {
        const total = events.length;
        const baseline = total / T;
        const countsByGroup = new Map<string, number>();
        for (const event of events) {
            const g = groupOf(ctx, event.key);
            if (g === null) {
                continue;
            }
            countsByGroup.set(g, (countsByGroup.get(g) ?? 0) + 1);
        }
        for (const [g, count] of countsByGroup) {
            const share = count / total;
            expected.set(g, (expected.get(g) ?? 0) + baseline * windowLength * share);
        }
    }

    return expected;
}

function computeDisplacement(ctx: AnalysisContext, marker: SetInfo, expectedByGroup: Map<string, number>, windowLength: number, last: Ms): SetDisplacement {
    const windowStart = marker.releasedAt;
    const windowEnd = Math.min(windowStart + windowLength, last);
    const partial = windowEnd < windowStart + windowLength;
    const observedFraction = windowLength > 0 ? (windowEnd - windowStart) / windowLength : 0;

    const observedByGroup = new Map<string, number>();
    const removalCounts = new Map<string, number>();
    for (const event of ctx.diffs) {
        if (event.type !== 'remove' || event.date < windowStart || event.date > windowEnd) {
            continue;
        }
        const g = groupOf(ctx, event.key);
        if (g === null) {
            continue;
        }
        observedByGroup.set(g, (observedByGroup.get(g) ?? 0) + 1);
        removalCounts.set(event.key, (removalCounts.get(event.key) ?? 0) + 1);
    }

    const groups: DisplacementGroup[] = [];
    for (const [g, removals] of observedByGroup) {
        const expected = (expectedByGroup.get(g) ?? 0) * observedFraction;
        const lift = expected > 0 ? removals / expected : 0;
        const [colorCategory, primaryType] = g.split('|');
        groups.push({ colorCategory: colorCategory as ColorCategory, primaryType, removals, expected, lift });
    }
    groups.sort((a, b) => b.lift - a.lift || b.removals - a.removals);

    const topCards = [...removalCounts.entries()]
        .map(([key, removals]) => ({ key, removals }))
        .sort((a, b) => b.removals - a.removals || a.key.localeCompare(b.key))
        .slice(0, 10);

    const addCounts = new Map<string, number>();
    for (const event of ctx.diffs) {
        if (event.type !== 'add' || event.date < windowStart || event.date > windowEnd) {
            continue;
        }
        addCounts.set(event.key, (addCounts.get(event.key) ?? 0) + 1);
    }

    const topAdded = [...addCounts.entries()]
        .map(([key, additions]) => ({
            key,
            additions,
            fromSet: ctx.panel.cardInfo.get(baseOracleId(key))?.eligibility?.setCode === marker.code,
        }))
        .sort((a, b) => b.additions - a.additions || a.key.localeCompare(b.key))
        .slice(0, 10);

    return { code: marker.code, groups, topCards, topAdded, partial };
}

export function analyzeSets(ctx: AnalysisContext): SetsResult {
    const { samples } = ctx.panel;

    if (samples.length === 0) {
        return { markers: [], adoption: [], displacement: [] };
    }

    const first = samples[0];
    const last = samples[samples.length - 1];

    const markers = ctx.sets
        .filter((s) => s.releasedAt >= first && s.releasedAt <= last)
        .sort((a, b) => a.releasedAt - b.releasedAt);

    const adoption: SetAdoption[] = [];
    for (const marker of markers) {
        const result = computeAdoption(ctx, marker);
        if (result) {
            adoption.push(result);
        }
    }

    const T = last - first;
    const windowLength = ctx.config.thresholds.displacementWeeks * WEEK;
    const expectedByGroup = T > 0 ? computeExpectedByGroup(ctx, windowLength, T) : new Map<string, number>();
    const displacement = markers.map((marker) => (
        T > 0
            ? computeDisplacement(ctx, marker, expectedByGroup, windowLength, last)
            : { code: marker.code, groups: [], topCards: [], topAdded: [], partial: true }
    ));

    return { markers, adoption, displacement };
}
