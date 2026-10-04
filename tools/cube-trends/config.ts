import type { Thresholds, TrendsConfig } from './types';

const DEFAULT_THRESHOLDS: Thresholds = {
    momentumMinPeakIr: 0.05,
    deltaWindowDays: 90,
    setMinCards: 2,
    displacementWeeks: 8,
    retentionWeeks: 26,
    trendsetterMinAdopters: 3,
    trendsetterMinAdoptions: 5,
    trendsetterConsensusIr: 0.2,
    substitutionMinCubes: 3,
    consensusNearMisses: 20,
};

export const DEFAULT_CONFIG: TrendsConfig = {
    interval: '1w',
    range: '1y',
    concurrency: 2,
    requestDelayMs: 500,
    maxRetries: 3,
    halfLifeDays: 180,
    similarityTau: 0.6,
    weighting: { recency: true, dedupe: true },
    eligibility: 'firstPrinting',
    includeBasics: false,
    consensus: { size: null, exclude: [] },
    thresholds: DEFAULT_THRESHOLDS,
};

export const MANIFEST_OVERRIDES: Record<string, Partial<TrendsConfig>> = {
    peasant: { eligibility: 'firstCommonOrUncommon' },
};

export function resolveConfig(manifestName: string, overrides: Partial<TrendsConfig> = {}): TrendsConfig {
    const manifestOverride = MANIFEST_OVERRIDES[manifestName] ?? {};
    return {
        ...DEFAULT_CONFIG,
        ...manifestOverride,
        ...overrides,
        weighting: {
            ...DEFAULT_CONFIG.weighting,
            ...manifestOverride.weighting,
            ...overrides.weighting,
        },
        consensus: {
            ...DEFAULT_CONFIG.consensus,
            ...manifestOverride.consensus,
            ...overrides.consensus,
            exclude: [
                ...(overrides.consensus?.exclude ?? manifestOverride.consensus?.exclude ?? DEFAULT_CONFIG.consensus.exclude),
            ],
        },
        thresholds: {
            ...DEFAULT_CONFIG.thresholds,
            ...manifestOverride.thresholds,
            ...overrides.thresholds,
        },
    };
}
