import type { Ms } from '../types';
import type { AnalysisContext } from './context';
import { baseOracleId, copyNumber, type CardInfo } from './cardInfo';
import { theilSen } from './stats';

const DAY = 86_400_000;

export interface CardTrend {
    key: string;
    info: CardInfo;
    ir: number[];
    unweighted: number[];
    count: number[];
    cubesPresent: number[][];
    current: number;
    peak: number;
    firstSeen: Ms | null;
    lastSeen: Ms | null;
    momentum: number | null;
    delta: number | null;
}

export interface CardsResult {
    cards: CardTrend[];
}

export function analyzeCards(ctx: AnalysisContext): CardsResult {
    const { panel, inclusion, config } = ctx;
    const { samples, grid } = panel;
    const { momentumMinPeakIr, deltaWindowDays } = config.thresholds;
    const last = samples.length - 1;

    const cards: CardTrend[] = [];

    for (const [key, row] of inclusion) {
        if (copyNumber(key) !== 1) {
            continue;
        }
        const { ir, unweighted, count } = row;
        const info = panel.cardInfo.get(baseOracleId(key))!;

        const cubesPresent: number[][] = samples.map((_, k) => {
            const present: number[] = [];
            for (let c = 0; c < grid.length; c++) {
                const revId = grid[c][k];
                if (revId !== null && panel.revisions.get(revId)!.cards.has(key)) {
                    present.push(c);
                }
            }
            return present;
        });

        let firstSeen: Ms | null = null;
        let lastSeen: Ms | null = null;
        for (let k = 0; k < samples.length; k++) {
            if (count[k] > 0) {
                firstSeen ??= samples[k];
                lastSeen = samples[k];
            }
        }

        const peak = Math.max(...ir);
        const momentum = peak >= momentumMinPeakIr
            ? theilSen(samples.map((t) => t / DAY), ir) * 30
            : null;

        let delta: number | null = null;
        if (samples.length >= 2) {
            const cutoff = samples[last] - deltaWindowDays * DAY;
            const j = samples.findIndex((t) => t >= cutoff);
            delta = ir[last] - ir[j];
        }

        cards.push({
            key,
            info,
            ir,
            unweighted,
            count,
            cubesPresent,
            current: ir[last],
            peak,
            firstSeen,
            lastSeen,
            momentum,
            delta,
        });
    }

    cards.sort((a, b) => b.current - a.current || a.key.localeCompare(b.key));

    return { cards };
}
