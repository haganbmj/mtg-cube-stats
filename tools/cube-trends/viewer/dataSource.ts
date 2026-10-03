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

const ANALYSIS_FILES = [
    'cards',
    'timeline',
    'sets',
    'shape',
    'churn',
    'survival',
    'trendsetters',
    'substitutions',
    'consensus',
] as const;

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

    const results = await Promise.all(ANALYSIS_FILES.map((file) => loadFile(name, file)));
    const data = Object.fromEntries(ANALYSIS_FILES.map((file, i) => [file, results[i]])) as AnalysisData;

    return { meta, ...data };
}
