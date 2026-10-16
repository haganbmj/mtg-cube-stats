import type { AnalysisContext } from './context';
import { baseOracleId, COLOR_CATEGORIES, copyNumber, MV_BUCKETS, mvBucket, type ColorCategory } from './cardInfo';
import type { ShapeResult } from './shape';
import { largestRemainder } from './stats';

const DAY = 86_400_000;

export interface ConsensusCard {
    oracleId: string;
    quantity: number;
    category: ColorCategory;
    score: number;
    rank: number;
    currentIr: number;
    elo: number | null;
}

export interface ConsensusResult {
    size: number;
    quotas: Record<ColorCategory, number>;
    cards: ConsensusCard[];
    nearMisses: Record<ColorCategory, ConsensusCard[]>;
    shape: {
        type: Record<string, { consensus: number; community: number }>;
        mv: Record<string, { consensus: number; community: number }>;
    };
}


function emptyResult(): ConsensusResult {
    return {
        size: 0,
        quotas: Object.fromEntries(COLOR_CATEGORIES.map((c) => [c, 0])) as Record<ColorCategory, number>,
        cards: [],
        nearMisses: COLOR_CATEGORIES.reduce((acc, cat) => {
            acc[cat] = [];
            return acc;
        }, {} as Record<ColorCategory, ConsensusCard[]>),
        shape: { type: {}, mv: {} },
    };
}

export function analyzeConsensus(ctx: AnalysisContext, shape: ShapeResult): ConsensusResult {
    const { panel, inclusion, config } = ctx;
    const last = shape.points[shape.points.length - 1];
    if (!last) {
        return emptyResult();
    }

    const excludeNames = new Set(config.consensus.exclude.map((name) => name.toLowerCase()));
    const candidates = [...inclusion.keys()].filter((key) => {
        const info = panel.cardInfo.get(baseOracleId(key));
        return info !== undefined && !excludeNames.has(info.name.toLowerCase());
    });

    const windowStart = panel.samples[panel.samples.length - 1] - config.thresholds.deltaWindowDays * DAY;
    const windowIndexes = panel.samples
        .map((t, i) => (t >= windowStart ? i : -1))
        .filter((i) => i >= 0);

    const scoreByKey = new Map<string, number>();
    for (const key of candidates) {
        const ir = inclusion.get(key)!.ir;
        const values = windowIndexes.map((i) => ir[i]);
        scoreByKey.set(key, values.reduce((sum, v) => sum + v, 0) / values.length);
    }

    const sorted = [...candidates].sort((a, b) => {
        const scoreDiff = scoreByKey.get(b)! - scoreByKey.get(a)!;
        if (scoreDiff !== 0) {
            return scoreDiff;
        }
        const eloDiff = (panel.elo.get(baseOracleId(b)) ?? -Infinity) - (panel.elo.get(baseOracleId(a)) ?? -Infinity);
        if (eloDiff !== 0) {
            return eloDiff;
        }
        const nameDiff = panel.cardInfo.get(baseOracleId(a))!.name.localeCompare(panel.cardInfo.get(baseOracleId(b))!.name);
        if (nameDiff !== 0) {
            return nameDiff;
        }
        return copyNumber(a) - copyNumber(b);
    });

    const size = config.consensus.size ?? Math.round(last.size.median);
    const quotas = largestRemainder(
        Object.fromEntries(COLOR_CATEGORIES.map((c) => [c, last.color[c].median])),
        size,
    ) as Record<ColorCategory, number>;

    const categoryOf = (key: string): ColorCategory => panel.cardInfo.get(baseOracleId(key))!.colorCategory;
    const prevCopyKey = (key: string): string => `${baseOracleId(key)}${'+'.repeat(copyNumber(key) - 2)}`;

    const selected = new Set<string>();
    const isSelectable = (key: string): boolean => {
        if (selected.has(key)) {
            return false;
        }
        return copyNumber(key) === 1 || selected.has(prevCopyKey(key));
    };

    const categoryCounts = Object.fromEntries(COLOR_CATEGORIES.map((c) => [c, 0])) as Record<ColorCategory, number>;
    const copy1Order = new Map<string, number>();
    let orderCounter = 0;

    const select = (key: string): void => {
        selected.add(key);
        categoryCounts[categoryOf(key)]++;
        if (copyNumber(key) === 1) {
            copy1Order.set(key, orderCounter++);
        }
    };

    for (const cat of COLOR_CATEGORIES) {
        let progress = true;
        while (categoryCounts[cat] < quotas[cat] && progress) {
            progress = false;
            for (const key of sorted) {
                if (categoryCounts[cat] >= quotas[cat]) {
                    break;
                }
                if (categoryOf(key) === cat && isSelectable(key)) {
                    select(key);
                    progress = true;
                }
            }
        }
    }

    while (selected.size < size) {
        const next = sorted.find((key) => isSelectable(key));
        if (!next) {
            break;
        }
        select(next);
    }

    const lastSampleIdx = panel.samples.length - 1;
    const quantities = new Map<string, number>();
    for (const key of selected) {
        const base = baseOracleId(key);
        quantities.set(base, (quantities.get(base) ?? 0) + 1);
    }

    const cardsByCategory = new Map<ColorCategory, ConsensusCard[]>(COLOR_CATEGORIES.map((c) => [c, []]));
    for (const [base, quantity] of quantities) {
        const info = panel.cardInfo.get(base)!;
        cardsByCategory.get(info.colorCategory)!.push({
            oracleId: base,
            quantity,
            category: info.colorCategory,
            score: scoreByKey.get(base)!,
            rank: 0,
            currentIr: inclusion.get(base)!.ir[lastSampleIdx],
            elo: panel.elo.get(base) ?? null,
        });
    }

    const cards: ConsensusCard[] = [];
    const lastRankByCategory = Object.fromEntries(COLOR_CATEGORIES.map((c) => [c, 0])) as Record<ColorCategory, number>;
    for (const cat of COLOR_CATEGORIES) {
        const list = cardsByCategory.get(cat)!;
        list.sort((a, b) => copy1Order.get(a.oracleId)! - copy1Order.get(b.oracleId)!);
        list.forEach((card, i) => {
            card.rank = i + 1;
        });
        lastRankByCategory[cat] = list.length;
        cards.push(...list);
    }

    const nearMisses = Object.fromEntries(COLOR_CATEGORIES.map((cat) => {
        const misses: ConsensusCard[] = [];
        for (const key of sorted) {
            if (misses.length >= config.thresholds.consensusNearMisses) {
                break;
            }
            if (categoryOf(key) !== cat || !isSelectable(key)) {
                continue;
            }
            misses.push({
                oracleId: baseOracleId(key),
                quantity: copyNumber(key),
                category: cat,
                score: scoreByKey.get(key)!,
                rank: lastRankByCategory[cat] + misses.length + 1,
                currentIr: inclusion.get(key)!.ir[lastSampleIdx],
                elo: panel.elo.get(baseOracleId(key)) ?? null,
            });
        }
        return [cat, misses];
    })) as Record<ColorCategory, ConsensusCard[]>;

    const typeCounts: Record<string, number> = {};
    const mvCounts = Object.fromEntries(MV_BUCKETS.map((b) => [b, 0]));
    for (const key of selected) {
        const info = panel.cardInfo.get(baseOracleId(key))!;
        typeCounts[info.primaryType] = (typeCounts[info.primaryType] ?? 0) + 1;
        if (info.colorCategory !== 'L') {
            mvCounts[mvBucket(info.cmc)]++;
        }
    }

    const type = Object.fromEntries(shape.types.map((t) => [
        t,
        { consensus: selected.size === 0 ? 0 : (typeCounts[t] ?? 0) / selected.size, community: last.type[t]?.median ?? 0 },
    ]));
    const mv = Object.fromEntries(MV_BUCKETS.map((bucket) => [
        bucket,
        { consensus: mvCounts[bucket], community: last.mvHistogram[bucket].median },
    ]));

    return { size, quotas, cards, nearMisses, shape: { type, mv } };
}
