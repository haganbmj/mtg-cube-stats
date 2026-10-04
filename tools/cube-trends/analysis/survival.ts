import type { Empty, Ms } from '../types';
import type { AnalysisContext } from './context';
import type { PanelRevision } from './panel';
import { baseOracleId } from './cardInfo';
import { kaplanMeier, type Spell } from './stats';

const DAY = 86_400_000;

export interface SurvivalCurves {
    overall: { t: number; s: number }[];
    newCards: { t: number; s: number }[];
    established: { t: number; s: number }[];
    spells: number;
}

export type SurvivalResult = SurvivalCurves | Empty;

interface SpellRecord {
    key: string;
    start: Ms;
    duration: number;
    entry: number;
    event: boolean;
}

// Walks a cube's distinct revisions in order, opening a spell when a key first appears
// (or reappears after a removal) and closing it when a later revision lacks it.
// firstSeen maps a revision id to the first sample observing it (the spell's entry time).
function computeCubeSpells(cRevisions: PanelRevision[], firstSeen: Map<string, Ms>, censorAt: Ms): SpellRecord[] {
    const spells: SpellRecord[] = [];
    const open = new Map<string, { start: Ms; observed: Ms }>();

    for (const rev of cRevisions) {
        for (const key of rev.cards) {
            if (!open.has(key)) {
                open.set(key, { start: rev.addedAt.get(key) ?? rev.date, observed: firstSeen.get(rev.id)! });
            }
        }
        for (const [key, { start, observed }] of [...open]) {
            if (!rev.cards.has(key)) {
                spells.push({ key, start, duration: Math.max(0, (rev.date - start) / DAY), entry: Math.max(0, (observed - start) / DAY), event: true });
                open.delete(key);
            }
        }
    }
    for (const [key, { start, observed }] of open) {
        spells.push({ key, start, duration: Math.max(0, (censorAt - start) / DAY), entry: Math.max(0, (observed - start) / DAY), event: false });
    }

    return spells;
}

export function analyzeSurvival(ctx: AnalysisContext): SurvivalResult {
    const { panel } = ctx;
    const { samples, grid, cubes, revisions, cardInfo } = panel;
    const lastSample = samples[samples.length - 1];
    const windowStart = samples[0];

    const overall: Spell[] = [];
    const newCards: Spell[] = [];
    const established: Spell[] = [];

    cubes.forEach((_cube, c) => {
        const firstSeen = new Map<string, Ms>();
        grid[c].forEach((id, k) => {
            if (id !== null && !firstSeen.has(id)) {
                firstSeen.set(id, samples[k]);
            }
        });
        const revIds = [...firstSeen.keys()]
            .sort((a, b) => revisions.get(a)!.date - revisions.get(b)!.date);
        const cRevisions = revIds.map((id) => revisions.get(id)!);

        for (const spell of computeCubeSpells(cRevisions, firstSeen, lastSample)) {
            const km: Spell = { duration: spell.duration, event: spell.event, entry: spell.entry };
            overall.push(km);

            const info = cardInfo.get(baseOracleId(spell.key));
            if (!info?.eligibility) {
                continue;
            }
            // New = released (first eligible) within the analysis window, matching Trendsetters' Mean Lag.
            if (info.eligibility.date >= windowStart) {
                newCards.push(km);
            } else {
                established.push(km);
            }
        }
    });

    if (overall.length === 0) {
        return { empty: true, reason: 'No card spells in the sampled window.' };
    }

    return {
        overall: kaplanMeier(overall),
        newCards: kaplanMeier(newCards),
        established: kaplanMeier(established),
        spells: overall.length,
    };
}
