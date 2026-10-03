import type { MetaResult } from '../output';
import type { CardsResult } from '../analysis/cards';
import type { TimelineResult } from '../analysis/timeline';
import type { SetsResult } from '../analysis/sets';
import type { ShapeResult } from '../analysis/shape';
import type { ChurnResult } from '../analysis/churn';
import type { SurvivalResult } from '../analysis/survival';
import type { TrendsettersResult } from '../analysis/trendsetters';
import type { SubstitutionsResult } from '../analysis/substitutions';
import type { ConsensusResult } from '../analysis/consensus';

export interface AnalysisData {
    cards: CardsResult;
    timeline: TimelineResult;
    sets: SetsResult;
    shape: ShapeResult;
    churn: ChurnResult;
    survival: SurvivalResult;
    trendsetters: TrendsettersResult;
    substitutions: SubstitutionsResult;
    consensus: ConsensusResult;
}

export type TrendsData = { meta: MetaResult } & Partial<AnalysisData>;

// Task 20 rewrites this literal glob pattern.
const modules = import.meta.glob('../output/*/*.json') as Record<string, () => Promise<{ default: unknown }>>;

export function listManifests(): string[] {
    const names = new Set<string>();
    for (const key of Object.keys(modules)) {
        const match = key.match(/^\.\.\/output\/([^/]+)\/meta\.json$/);
        if (match) {
            names.add(match[1]);
        }
    }
    return [...names].sort();
}

async function loadFile<T>(name: string, file: string): Promise<T> {
    const key = `../output/${name}/${file}.json`;
    const loader = modules[key];
    if (!loader) {
        throw new Error(`Missing output file: ${key}`);
    }
    const mod = await loader();
    return mod.default as T;
}

export async function loadManifestData(name: string): Promise<TrendsData> {
    const meta = await loadFile<MetaResult>(name, 'meta');
    if (meta.empty) {
        return { meta };
    }

    const [cards, timeline, sets, shape, churn, survival, trendsetters, substitutions, consensus] = await Promise.all([
        loadFile<CardsResult>(name, 'cards'),
        loadFile<TimelineResult>(name, 'timeline'),
        loadFile<SetsResult>(name, 'sets'),
        loadFile<ShapeResult>(name, 'shape'),
        loadFile<ChurnResult>(name, 'churn'),
        loadFile<SurvivalResult>(name, 'survival'),
        loadFile<TrendsettersResult>(name, 'trendsetters'),
        loadFile<SubstitutionsResult>(name, 'substitutions'),
        loadFile<ConsensusResult>(name, 'consensus'),
    ]);

    return { meta, cards, timeline, sets, shape, churn, survival, trendsetters, substitutions, consensus };
}
