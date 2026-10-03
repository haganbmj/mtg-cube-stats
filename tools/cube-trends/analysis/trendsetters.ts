import type { Empty, Ms } from '../types';
import type { AnalysisContext } from './context';
import { baseOracleId } from './cardInfo';

const DAY = 86_400_000;

export interface Trendsetter {
    cubeId: string;
    adoptions: number;
    meanPercentile: number;
    meanLagDays: number | null;
    leadOnConsensus: number;
    examples: { oracleId: string; date: Ms; percentile: number }[];
}

export type TrendsettersResult = { cubes: Trendsetter[] } | Empty;

interface Adoption {
    cubeId: string;
    key: string;
    date: Ms;
}

interface RankedAdoption extends Adoption {
    percentile: number;
}

function firstAdoptions(ctx: AnalysisContext): Adoption[] {
    const firstByCubeKey = new Map<string, Adoption>();
    for (const event of ctx.diffs) {
        if (event.type !== 'add') {
            continue;
        }
        const mapKey = `${event.cubeId}\u0000${event.key}`;
        const existing = firstByCubeKey.get(mapKey);
        if (!existing || event.date < existing.date) {
            firstByCubeKey.set(mapKey, { cubeId: event.cubeId, key: event.key, date: event.date });
        }
    }
    return [...firstByCubeKey.values()];
}

// Rank = number of adopters with a strictly earlier date; ties share the lower rank.
function rankAdoptions(adoptions: Adoption[]): RankedAdoption[] {
    const n = adoptions.length;
    return adoptions.map((adoption) => {
        const rank = adoptions.filter((a) => a.date < adoption.date).length;
        return { ...adoption, percentile: rank / (n - 1) };
    });
}

export function analyzeTrendsetters(ctx: AnalysisContext): TrendsettersResult {
    const { panel, inclusion, config } = ctx;
    const { trendsetterMinAdopters, trendsetterMinAdoptions, trendsetterConsensusIr } = config.thresholds;

    const adoptionsByKey = new Map<string, Adoption[]>();
    for (const adoption of firstAdoptions(ctx)) {
        const list = adoptionsByKey.get(adoption.key) ?? [];
        list.push(adoption);
        adoptionsByKey.set(adoption.key, list);
    }

    const perCube = new Map<string, RankedAdoption[]>();
    for (const adoptions of adoptionsByKey.values()) {
        if (adoptions.length < trendsetterMinAdopters) {
            continue;
        }
        for (const ranked of rankAdoptions(adoptions)) {
            const list = perCube.get(ranked.cubeId) ?? [];
            list.push(ranked);
            perCube.set(ranked.cubeId, list);
        }
    }

    const cubes: Trendsetter[] = [];
    for (const [cubeId, adoptions] of perCube) {
        if (adoptions.length < trendsetterMinAdoptions) {
            continue;
        }

        const meanPercentile = adoptions.reduce((sum, a) => sum + a.percentile, 0) / adoptions.length;

        const lagDays: number[] = [];
        for (const a of adoptions) {
            const eligibility = panel.cardInfo.get(baseOracleId(a.key))?.eligibility;
            if (eligibility) {
                lagDays.push((a.date - eligibility.date) / DAY);
            }
        }
        const meanLagDays = lagDays.length === 0 ? null : lagDays.reduce((sum, v) => sum + v, 0) / lagDays.length;

        let leadOnConsensus = 0;
        for (const a of adoptions) {
            if (a.percentile > 0.25) {
                continue;
            }
            const ir = inclusion.get(a.key)?.ir ?? [];
            const lastIr = ir[ir.length - 1] ?? 0;
            if (lastIr >= trendsetterConsensusIr) {
                leadOnConsensus++;
            }
        }

        const examples = [...adoptions]
            .sort((a, b) => a.percentile - b.percentile || a.date - b.date || a.key.localeCompare(b.key))
            .slice(0, 5)
            .map((a) => ({ oracleId: a.key, date: a.date, percentile: a.percentile }));

        cubes.push({ cubeId, adoptions: adoptions.length, meanPercentile, meanLagDays, leadOnConsensus, examples });
    }

    if (cubes.length === 0) {
        return {
            empty: true,
            reason: `No cube reached ${trendsetterMinAdoptions} adoptions of cards with >= ${trendsetterMinAdopters} adopters.`,
        };
    }

    cubes.sort((a, b) => a.meanPercentile - b.meanPercentile || a.cubeId.localeCompare(b.cubeId));

    return { cubes };
}
