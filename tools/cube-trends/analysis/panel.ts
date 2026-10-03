import type { Ms, CubeIndex, CompactRevision, Eligibility, CoverageInterval } from '../types';
import { resolveAt } from '../fetch/coverage';
import { remapCube } from '../../../src/util/CubeFunctions';
import { suffixedDuplicates } from '../../../src/util/SimiliartyFunctions';
import type { ScryfallCard } from '../../../src/types/scryfall';
import type { Manifest, CubePredicate } from '../../../preloads/manifests/types';
import { buildCardInfo, type CardInfo } from './cardInfo';

export interface PanelRevision {
    id: string;
    cubeId: string;
    date: Ms;
    cards: Set<string>;
    addedAt: Map<string, Ms>;
}

export interface PanelCube {
    id: string;
    name: string;
    owner: string;
}

export interface Panel {
    samples: Ms[];
    cubes: PanelCube[];
    grid: (string | null)[][];
    revisions: Map<string, PanelRevision>;
    cardInfo: Map<string, CardInfo>;
    elo: Map<string, number>;
    unknownCards: number;
}

export interface MemberEntry {
    cubeId: string;
    index: CubeIndex;
}

function normalizeIncludes(include: Manifest['include']): CubePredicate[] {
    if (!include) {
        return [];
    }
    return Array.isArray(include) ? include : [include];
}

function newestInterval(index: CubeIndex): CoverageInterval {
    return index.coverage.reduce((best, iv) => (iv.to > best.to ? iv : best));
}

function shouldIncludeCard(card: { isCustomCard?: boolean; oracleId: string }, cards: Record<string, ScryfallCard>, includeBasics: boolean): boolean {
    if (card.isCustomCard) {
        return false;
    }
    const scryfallCard = cards[card.oracleId];
    if (!scryfallCard) {
        return false;
    }
    if (!includeBasics && scryfallCard.effectiveTypes.includes('Basic')) {
        return false;
    }
    return true;
}

export function selectMembers(
    manifest: Manifest,
    entries: MemberEntry[],
    loadRevision: (cubeId: string, id: string) => CompactRevision,
): MemberEntry[] {
    const predicates = normalizeIncludes(manifest.include);
    return entries.filter((entry) => {
        if (entry.index.missing || entry.index.coverage.length === 0) {
            return false;
        }
        const newest = newestInterval(entry.index);
        const raw = loadRevision(entry.cubeId, newest.id);
        const cube = remapCube(raw, false);
        return predicates.every((p) => p(cube));
    });
}

function buildPanelRevision(
    cubeId: string,
    raw: CompactRevision,
    cards: Record<string, ScryfallCard>,
    includeBasics: boolean,
    unknownOracleIds: Set<string>,
    cardOracleIds: Set<string>,
): PanelRevision {
    const remapped = remapCube(raw, false);
    const filteredOracleIds: string[] = [];
    const timestampsByOracleId = new Map<string, number[]>();

    remapped.cards.forEach((card, i) => {
        if (card.isCustomCard) {
            return;
        }
        const oracleId = card.oracleId;
        if (!shouldIncludeCard(card, cards, includeBasics)) {
            if (!cards[oracleId]) {
                unknownOracleIds.add(oracleId);
            }
            return;
        }

        filteredOracleIds.push(oracleId);
        cardOracleIds.add(oracleId);

        const addedTmsp = Number(raw.cards.mainboard[i].addedTmsp);
        if (!Number.isNaN(addedTmsp)) {
            const timestamps = timestampsByOracleId.get(oracleId) ?? [];
            timestamps.push(addedTmsp);
            timestampsByOracleId.set(oracleId, timestamps);
        }
    });

    const cardSet = new Set(suffixedDuplicates([...filteredOracleIds]));

    const addedAt = new Map<string, Ms>();
    for (const [oracleId, timestamps] of timestampsByOracleId) {
        timestamps.sort((a, b) => a - b);
        timestamps.forEach((ts, idx) => {
            const key = idx === 0 ? oracleId : `${oracleId}${'+'.repeat(idx)}`;
            addedAt.set(key, ts);
        });
    }

    return { id: raw.id, cubeId, date: raw.changelog.date, cards: cardSet, addedAt };
}

export function buildPanel(input: {
    samples: Ms[];
    members: MemberEntry[];
    loadRevision: (cubeId: string, id: string) => CompactRevision;
    cards: Record<string, ScryfallCard>;
    eligibility: Map<string, Eligibility>;
    includeBasics: boolean;
}): Panel {
    const { samples, members, loadRevision, cards, eligibility, includeBasics } = input;

    const cubes: PanelCube[] = [];
    const grid: (string | null)[][] = [];
    const revisions = new Map<string, PanelRevision>();
    const unknownOracleIds = new Set<string>();
    const cardOracleIds = new Set<string>();
    const elo = new Map<string, number>();

    for (const member of members) {
        const row: (string | null)[] = [];
        for (const t of samples) {
            const id = resolveAt(member.index, t);
            row.push(id ?? null);
            if (id && !revisions.has(id)) {
                const raw = loadRevision(member.cubeId, id);
                revisions.set(id, buildPanelRevision(member.cubeId, raw, cards, includeBasics, unknownOracleIds, cardOracleIds));
            }
        }
        grid.push(row);

        const newest = newestInterval(member.index);
        const newestRaw = loadRevision(member.cubeId, newest.id);
        if (!revisions.has(newest.id)) {
            revisions.set(newest.id, buildPanelRevision(member.cubeId, newestRaw, cards, includeBasics, unknownOracleIds, cardOracleIds));
        }

        const remapped = remapCube(newestRaw, false);
        cubes.push({ id: member.cubeId, name: newestRaw.name, owner: remapped.owner });

        for (const card of remapped.cards) {
            if (card.elo === undefined || !shouldIncludeCard(card, cards, includeBasics)) {
                continue;
            }
            const current = elo.get(card.oracleId);
            if (current === undefined || card.elo > current) {
                elo.set(card.oracleId, card.elo);
            }
        }
    }

    const cardInfo = new Map<string, CardInfo>();
    for (const oracleId of cardOracleIds) {
        const card = cards[oracleId];
        if (card) {
            cardInfo.set(oracleId, buildCardInfo(oracleId, card, eligibility));
        }
    }

    return { samples, cubes, grid, revisions, cardInfo, elo, unknownCards: unknownOracleIds.size };
}
