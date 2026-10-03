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
    event: boolean;
}

// Walks a cube's distinct revisions in order, opening a spell when a key first appears
// (or reappears after a removal) and closing it when a later revision lacks it.
function computeCubeSpells(cRevisions: PanelRevision[], censorAt: Ms): SpellRecord[] {
    const spells: SpellRecord[] = [];
    const open = new Map<string, Ms>();

    for (const rev of cRevisions) {
        for (const key of rev.cards) {
            if (!open.has(key)) {
                open.set(key, rev.addedAt.get(key) ?? rev.date);
            }
        }
        for (const [key, start] of [...open]) {
            if (!rev.cards.has(key)) {
                spells.push({ key, start, duration: Math.max(0, (rev.date - start) / DAY), event: true });
                open.delete(key);
            }
        }
    }
    for (const [key, start] of open) {
        spells.push({ key, start, duration: Math.max(0, (censorAt - start) / DAY), event: false });
    }

    return spells;
}

export function analyzeSurvival(ctx: AnalysisContext): SurvivalResult {
    const { panel, config } = ctx;
    const { samples, grid, cubes, revisions, cardInfo } = panel;
    const lastSample = samples[samples.length - 1];
    const newCardThresholdMs = config.thresholds.survivalNewCardMonths * 30 * DAY;

    const overall: Spell[] = [];
    const newCards: Spell[] = [];
    const established: Spell[] = [];

    cubes.forEach((_cube, c) => {
        const revIds = [...new Set(grid[c].filter((id): id is string => id !== null))]
            .sort((a, b) => revisions.get(a)!.date - revisions.get(b)!.date);
        const cRevisions = revIds.map((id) => revisions.get(id)!);

        for (const spell of computeCubeSpells(cRevisions, lastSample)) {
            const entry: Spell = { duration: spell.duration, event: spell.event };
            overall.push(entry);

            const info = cardInfo.get(baseOracleId(spell.key));
            if (!info?.eligibility) {
                continue;
            }
            if (spell.start - info.eligibility.date < newCardThresholdMs) {
                newCards.push(entry);
            } else {
                established.push(entry);
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
