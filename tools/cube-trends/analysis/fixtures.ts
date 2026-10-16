// Test-only synthetic AnalysisContext builders shared by analysis test suites.
import type { Ms, TrendsConfig } from '../types';
import { resolveConfig } from '../config';
import { baseOracleId, type CardInfo } from './cardInfo';
import { buildContext, type AnalysisContext, type SetInfo } from './context';
import type { Panel, PanelCube, PanelRevision } from './panel';

export function makeCardInfo(oracleId: string, overrides: Partial<CardInfo> = {}): CardInfo {
    return {
        oracleId,
        name: oracleId,
        urlFront: '',
        colors: ['R'],
        colorCategory: 'R',
        primaryType: 'Instant',
        cmc: 1,
        isBasic: false,
        eligibility: null,
        ...overrides,
    };
}

export interface FixtureRevisionSpec {
    id: string;
    date: Ms;
    cards: string[];
    addedAt?: Record<string, Ms>;
}

export interface FixtureCubeSpec {
    id: string;
    revisions: FixtureRevisionSpec[];
    grid: (string | null)[];
}

export interface ContextSpec {
    samples: Ms[];
    cubes: FixtureCubeSpec[];
    cardInfo?: CardInfo[];
    config?: Partial<TrendsConfig>;
    sets?: SetInfo[];
}

export function makeContext(spec: ContextSpec): AnalysisContext {
    const cubes: PanelCube[] = [];
    const grid: (string | null)[][] = [];
    const revisions = new Map<string, PanelRevision>();

    for (const cube of spec.cubes) {
        cubes.push({ id: cube.id, name: cube.id, owner: cube.id });
        grid.push(cube.grid);

        for (const rev of cube.revisions) {
            revisions.set(rev.id, {
                id: rev.id,
                cubeId: cube.id,
                date: rev.date,
                cards: new Set(rev.cards),
                addedAt: new Map(Object.entries(rev.addedAt ?? {})),
            });
        }
    }

    const cardInfo = new Map<string, CardInfo>();
    for (const info of spec.cardInfo ?? []) {
        cardInfo.set(info.oracleId, info);
    }
    for (const rev of revisions.values()) {
        for (const key of rev.cards) {
            const oracleId = baseOracleId(key);
            if (!cardInfo.has(oracleId)) {
                cardInfo.set(oracleId, makeCardInfo(oracleId));
            }
        }
    }

    const panel: Panel = {
        samples: spec.samples,
        cubes,
        grid,
        revisions,
        cardInfo,
        elo: new Map(),
        unknownCards: 0,
    };

    return buildContext(panel, resolveConfig('test', spec.config), spec.sets ?? []);
}
