export type Ms = number;

export type EligibilityRule = 'firstPrinting' | 'firstCommonOrUncommon' | 'firstCommon';

export interface CoverageInterval {
    id: string;
    from: Ms;
    to: Ms;
}

export interface CubeIndex {
    cubeId: string;
    coverage: CoverageInterval[];
    createdAfter: Ms | null;
    gaps: Ms[];
    missing: boolean;
    fetchedAt: Ms;
}

// raw CubeCobra shape subset; see Task 3
export interface CompactRevision {
    id: string;
    changelog: { id: string; date: Ms };
    cards: { mainboard: any[] };
    [k: string]: any;
}

export interface Eligibility {
    date: Ms;
    setCode: string;
    fallback: boolean;
}

export interface Thresholds {
    momentumMinPeakIr: number;
    deltaWindowDays: number;
    setMinCards: number;
    setMomentumMinPeak: number;
    displacementWeeks: number;
    retentionWeeks: number;
    trendsetterMinAdopters: number;
    trendsetterMinAdoptions: number;
    trendsetterConsensusIr: number;
    substitutionMinCubes: number;
    consensusNearMisses: number;
}

export interface TrendsConfig {
    interval: string;
    range: string;
    concurrency: number;
    requestDelayMs: number;
    maxRetries: number;
    halfLifeDays: number;
    similarityTau: number;
    weighting: { recency: boolean; dedupe: boolean };
    eligibility: EligibilityRule;
    includeBasics: boolean;
    consensus: { size: number | null; exclude: string[] };
    thresholds: Thresholds;
}

export interface Empty {
    empty: true;
    reason: string;
}
