import type { Empty } from '../types';
import type { AnalysisContext } from './context';
import { baseOracleId } from './cardInfo';

export interface Substitution {
    removed: string;
    added: string;
    cubes: number;
    lift: number;
}

export type SubstitutionsResult = { pairs: Substitution[] } | Empty;

interface Transition {
    cubeId: string;
    removed: Set<string>;
    added: Set<string>;
}

interface PairAccumulator {
    removed: string;
    added: string;
    transitions: number;
    cubes: Set<string>;
}

function groupTransitions(ctx: AnalysisContext): Transition[] {
    const byTransition = new Map<string, Transition>();
    for (const event of ctx.diffs) {
        const mapKey = `${event.cubeId}\u0000${event.fromRevision}\u0000${event.toRevision}`;
        let transition = byTransition.get(mapKey);
        if (!transition) {
            transition = { cubeId: event.cubeId, removed: new Set(), added: new Set() };
            byTransition.set(mapKey, transition);
        }
        (event.type === 'remove' ? transition.removed : transition.added).add(event.key);
    }
    return [...byTransition.values()];
}

export function analyzeSubstitutions(ctx: AnalysisContext): SubstitutionsResult {
    const { panel, config } = ctx;
    const { substitutionMinCubes } = config.thresholds;

    const transitions = groupTransitions(ctx);
    const n = transitions.length;
    if (n === 0) {
        return { empty: true, reason: 'No revision transitions found.' };
    }

    const removeCounts = new Map<string, number>();
    const addCounts = new Map<string, number>();
    const pairs = new Map<string, PairAccumulator>();

    for (const transition of transitions) {
        for (const x of transition.removed) {
            removeCounts.set(x, (removeCounts.get(x) ?? 0) + 1);
        }
        for (const y of transition.added) {
            addCounts.set(y, (addCounts.get(y) ?? 0) + 1);
        }

        for (const x of transition.removed) {
            const xInfo = panel.cardInfo.get(baseOracleId(x));
            if (!xInfo) {
                continue;
            }
            for (const y of transition.added) {
                const yBase = baseOracleId(y);
                if (yBase === baseOracleId(x)) {
                    continue;
                }
                const yInfo = panel.cardInfo.get(yBase);
                if (!yInfo || yInfo.colorCategory !== xInfo.colorCategory || yInfo.primaryType !== xInfo.primaryType) {
                    continue;
                }

                const pairKey = `${x}\u0000${y}`;
                let pair = pairs.get(pairKey);
                if (!pair) {
                    pair = { removed: x, added: y, transitions: 0, cubes: new Set() };
                    pairs.set(pairKey, pair);
                }
                pair.transitions++;
                pair.cubes.add(transition.cubeId);
            }
        }
    }

    const result: Substitution[] = [];
    for (const pair of pairs.values()) {
        const cubeCount = pair.cubes.size;
        if (cubeCount < substitutionMinCubes) {
            continue;
        }
        const pX = (removeCounts.get(pair.removed) ?? 0) / n;
        const pY = (addCounts.get(pair.added) ?? 0) / n;
        const pXY = pair.transitions / n;
        result.push({ removed: pair.removed, added: pair.added, cubes: cubeCount, lift: pXY / (pX * pY) });
    }

    if (result.length === 0) {
        return { empty: true, reason: `No substitution pair reached ${substitutionMinCubes} cubes.` };
    }

    result.sort((a, b) =>
        b.cubes - a.cubes ||
        b.lift - a.lift ||
        a.removed.localeCompare(b.removed) ||
        a.added.localeCompare(b.added));

    return { pairs: result.slice(0, 100) };
}
