import type { Panel } from './panel';
import type { Ms, TrendsConfig } from '../types';
import { type DiffEvent, computeDiffs } from './diffs';
import { createSimilarity } from './similarity';
import { computeWeights } from './weights';
import { computeInclusion, type InclusionRow } from './inclusion';

export interface SetInfo {
    code: string;
    name: string;
    releasedAt: Ms;
}

export interface AnalysisContext {
    panel: Panel;
    weights: number[][];
    sim: (a: string, b: string) => number;
    inclusion: Map<string, InclusionRow>;
    diffs: DiffEvent[];
    config: TrendsConfig;
    sets: SetInfo[];
}

export function buildContext(panel: Panel, config: TrendsConfig, sets: SetInfo[]): AnalysisContext {
    const sim = createSimilarity(panel);
    const weights = computeWeights(panel, config, sim);
    const inclusion = computeInclusion(panel, weights);
    const diffs = computeDiffs(panel);

    return { panel, weights, sim, inclusion, diffs, config, sets };
}
