import { describe, it, expect } from 'vitest';
import type { ScryfallCard } from '../../../src/types/scryfall';
import type { CompactRevision, CubeIndex, Ms } from '../types';
import type { Manifest } from '../../../preloads/manifests/types';
import { colorCategory, baseOracleId, copyNumber } from './cardInfo';
import { selectMembers, buildPanel, gridAnchor, type Panel, type MemberEntry } from './panel';
import { computeDiffs } from './diffs';
import { resolveAt } from '../fetch/coverage';
import { sampleDates, DAY } from '../fetch/sampling';

function scryfallCard(overrides: Partial<ScryfallCard>): ScryfallCard {
    return {
        setCode: 'tst',
        collectorNumber: '1',
        releaseDate: '2020-01-01',
        name: 'Test Card',
        cmc: 1,
        colors: [],
        colorIdentity: [],
        typeLine: 'Instant',
        effectiveTypes: ['Instant'],
        primaryType: 'Instant',
        oracleText: '',
        oracleTextWordCount: 0,
        oracleTextWordCountMinusParen: 0,
        keywords: [],
        games: ['paper'],
        tags: [],
        archetypes: [],
        rarity: 'common',
        setType: 'core',
        fromBooster: true,
        layout: 'normal',
        legality: {},
        urlFront: 'https://example.com/front.png',
        minRarity: 'common',
        ...overrides,
    };
}

const cards: Record<string, ScryfallCard> = {
    bolt: scryfallCard({ name: 'Lightning Bolt', colors: ['R'], primaryType: 'Instant', effectiveTypes: ['Instant'], cmc: 1 }),
    counterspell: scryfallCard({ name: 'Counterspell', colors: ['U'], primaryType: 'Instant', effectiveTypes: ['Instant'], cmc: 2 }),
    forest: scryfallCard({
        name: 'Forest',
        colors: [],
        primaryType: 'Land',
        effectiveTypes: ['Land', 'Basic'],
        typeLine: 'Basic Land - Forest',
        cmc: 0,
    }),
    charm: scryfallCard({ name: 'Boros Charm', colors: ['R', 'W'], primaryType: 'Instant', effectiveTypes: ['Instant'], cmc: 2 }),
    ornithopter: scryfallCard({ name: 'Ornithopter', colors: [], primaryType: 'Artifact', effectiveTypes: ['Artifact'], cmc: 0 }),
    dual: scryfallCard({ name: 'Tropical Island', colors: ['U', 'G'], primaryType: 'Land', effectiveTypes: ['Land'], typeLine: 'Land' }),
};

interface MainboardEntry {
    oracleId: string;
    addedTmsp?: string;
    elo?: number;
    custom?: boolean;
}

function rawRevision(opts: { id: string; date: Ms; name?: string; owner?: string; mainboard: MainboardEntry[] }): CompactRevision {
    return {
        id: opts.id,
        name: opts.name ?? 'Test Cube',
        owner: { id: 'owner1', username: opts.owner ?? 'alice' },
        changelog: { id: opts.id, date: opts.date },
        cards: {
            mainboard: opts.mainboard.map((c, i) => c.custom
                ? { cardID: 'custom-card', custom_name: 'Homebrew', addedTmsp: c.addedTmsp ?? '1000' }
                : {
                    cardID: `printing-${i}`,
                    addedTmsp: c.addedTmsp ?? '1000',
                    details: { oracle_id: c.oracleId, scryfall_id: `printing-${i}`, elo: c.elo },
                }),
        },
    } as unknown as CompactRevision;
}

function indexWithCoverage(cubeId: string, coverage: { id: string; from: Ms; to: Ms }[]): CubeIndex {
    return { cubeId, coverage, createdAfter: null, gaps: [], missing: false, fetchedAt: 0 };
}

describe('colorCategory', () => {
    it('returns the lone color for Lightning Bolt', () => {
        expect(colorCategory(cards.bolt)).toBe('R');
    });

    it('returns M for a multicolor card', () => {
        expect(colorCategory(cards.charm)).toBe('M');
    });

    it('returns C for a colorless card', () => {
        expect(colorCategory(cards.ornithopter)).toBe('C');
    });

    it('returns L for a land regardless of color count', () => {
        expect(colorCategory(cards.dual)).toBe('L');
    });
});

describe('baseOracleId / copyNumber', () => {
    it('strips trailing + and counts copies', () => {
        expect(baseOracleId('bolt++')).toBe('bolt');
        expect(copyNumber('bolt++')).toBe(3);
        expect(copyNumber('bolt')).toBe(1);
    });
});

describe('buildPanel', () => {
    it('excludes basics by default and includes them with includeBasics', () => {
        const rev = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'bolt' }, { oracleId: 'forest' }] });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];
        const loadRevision = () => rev;

        const withoutBasics = buildPanel({ samples: [100], members, loadRevision, cards, eligibility: new Map(), includeBasics: false });
        expect(withoutBasics.revisions.get('rev1')!.cards).toEqual(new Set(['bolt']));

        const withBasics = buildPanel({ samples: [100], members, loadRevision, cards, eligibility: new Map(), includeBasics: true });
        expect(withBasics.revisions.get('rev1')!.cards).toEqual(new Set(['bolt', 'forest']));
    });

    it('excludes custom cards always', () => {
        const rev = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'bolt' }, { oracleId: 'custom', custom: true }] });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];
        const panel = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: false });

        expect(panel.revisions.get('rev1')!.cards).toEqual(new Set(['bolt']));
        expect(panel.unknownCards).toBe(0);
    });

    it('excludes and counts unknown oracle ids', () => {
        const rev = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'bolt' }, { oracleId: 'mystery' }] });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];
        const panel = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: false });

        expect(panel.revisions.get('rev1')!.cards).toEqual(new Set(['bolt']));
        expect(panel.unknownCards).toBe(1);
    });

    it('keeps duplicate copies as suffixed keys', () => {
        const rev = rawRevision({
            id: 'rev1',
            date: 100,
            mainboard: [{ oracleId: 'bolt', addedTmsp: '2000' }, { oracleId: 'bolt', addedTmsp: '1000' }],
        });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];
        const panel = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: false });

        const revision = panel.revisions.get('rev1')!;
        expect(revision.cards).toEqual(new Set(['bolt', 'bolt+']));
        expect(revision.addedAt.get('bolt')).toBe(1000);
        expect(revision.addedAt.get('bolt+')).toBe(2000);
    });

    it('assigns 16 copy keys for 16 Forests with includeBasics', () => {
        const mainboard = Array.from({ length: 16 }, () => ({ oracleId: 'forest' }));
        const rev = rawRevision({ id: 'rev1', date: 100, mainboard });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];
        const panel = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: true });

        const revision = panel.revisions.get('rev1')!;
        expect(revision.cards.size).toBe(16);
        const sortedKeys = [...revision.cards].sort((a, b) => a.length - b.length);
        const lastKey = sortedKeys[sortedKeys.length - 1];
        expect(copyNumber(lastKey)).toBe(16);
        expect(baseOracleId(lastKey)).toBe('forest');
    });

    it('grid is null before creation and in uncovered samples', () => {
        const index: CubeIndex = {
            cubeId: 'cube1',
            coverage: [{ id: 'rev1', from: 200, to: 300 }],
            createdAfter: 50,
            gaps: [],
            missing: false,
            fetchedAt: 0,
        };
        const rev = rawRevision({ id: 'rev1', date: 250, mainboard: [{ oracleId: 'bolt' }] });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index }];
        // samples: before createdAfter (null), uncovered gap (undefined), covered (rev1)
        const panel = buildPanel({ samples: [10, 100, 250], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: false });

        expect(panel.grid).toEqual([[null, null, 'rev1']]);
    });

    it('excludes basic lands from elo by default and includes them with includeBasics', () => {
        const rev = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'forest', elo: 1500 }] });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];

        const withoutBasics = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: false });
        expect(withoutBasics.elo.has('forest')).toBe(false);

        const withBasics = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: true });
        expect(withBasics.elo.get('forest')).toBe(1500);
    });

    it('excludes unknown oracle ids from elo', () => {
        const rev = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'bolt', elo: 1800 }, { oracleId: 'mystery', elo: 1600 }] });
        const members: MemberEntry[] = [{ cubeId: 'cube1', index: indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]) }];
        const panel = buildPanel({ samples: [100], members, loadRevision: () => rev, cards, eligibility: new Map(), includeBasics: false });

        expect(panel.elo.get('bolt')).toBe(1800);
        expect(panel.elo.has('mystery')).toBe(false);
    });

    it('elo is the max across two members newest revisions', () => {
        const rev1 = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'bolt', elo: 1600 }] });
        const rev2 = rawRevision({ id: 'rev2', date: 100, mainboard: [{ oracleId: 'bolt', elo: 1800 }] });
        const index1 = indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }]);
        const index2 = indexWithCoverage('cube2', [{ id: 'rev2', from: 100, to: 100 }]);
        const members: MemberEntry[] = [
            { cubeId: 'cube1', index: index1 },
            { cubeId: 'cube2', index: index2 },
        ];
        const loadRevision = (cubeId: string) => (cubeId === 'cube1' ? rev1 : rev2);

        const panel = buildPanel({ samples: [100], members, loadRevision, cards, eligibility: new Map(), includeBasics: false });
        expect(panel.elo.get('bolt')).toBe(1800);
    });
})

describe('gridAnchor', () => {
    it('is the max newest coverage end across indexes', () => {
        const a = indexWithCoverage('a', [{ id: 'r1', from: 0, to: 500 }, { id: 'r2', from: 500, to: 900 }]);
        const b = indexWithCoverage('b', [{ id: 'r3', from: 0, to: 700 }]);
        expect(gridAnchor([a, b])).toBe(900);
    });

    it('is null when no index has coverage', () => {
        expect(gridAnchor([indexWithCoverage('a', [])])).toBeNull();
        expect(gridAnchor([])).toBeNull();
    });

    it('resolves the latest sample when analyze runs a day after the fetch', () => {
        const fetchedAt = 100 * DAY + 15 * 3_600_000;
        const index = indexWithCoverage('a', [{ id: 'r1', from: 90 * DAY, to: fetchedAt }]);
        const interval = 14 * DAY;
        const range = 28 * DAY;

        const wallClockSamples = sampleDates(fetchedAt + DAY, interval, range);
        expect(resolveAt(index, wallClockSamples[wallClockSamples.length - 1])).toBeUndefined();

        const samples = sampleDates(gridAnchor([index])!, interval, range);
        expect(resolveAt(index, samples[samples.length - 1])).toBe('r1');
    });
});

describe('selectMembers', () => {
    it('skips missing indexes and indexes with no coverage', () => {
        const manifest: Manifest = { name: 'test', label: 'Test', fetch: null, cubes: [] };
        const entries: MemberEntry[] = [
            { cubeId: 'missing', index: { cubeId: 'missing', coverage: [], createdAfter: null, gaps: [], missing: true, fetchedAt: 0 } },
            { cubeId: 'empty', index: { cubeId: 'empty', coverage: [], createdAfter: null, gaps: [], missing: false, fetchedAt: 0 } },
            { cubeId: 'ok', index: indexWithCoverage('ok', [{ id: 'rev1', from: 100, to: 100 }]) },
        ];
        const loadRevision = () => rawRevision({ id: 'rev1', date: 100, mainboard: [] });

        const result = selectMembers(manifest, entries, loadRevision);
        expect(result.map((e) => e.cubeId)).toEqual(['ok']);
    });

    it('applies include predicates to the newest revision', () => {
        const manifest: Manifest = { name: 'test', label: 'Test', fetch: null, cubes: [], include: (cube) => cube.name === 'Keep Me' };
        const entries: MemberEntry[] = [
            { cubeId: 'keep', index: indexWithCoverage('keep', [{ id: 'rev1', from: 100, to: 100 }]) },
            { cubeId: 'drop', index: indexWithCoverage('drop', [{ id: 'rev1', from: 100, to: 100 }]) },
        ];
        const loadRevision = (cubeId: string, id: string) => rawRevision({
            id,
            date: 100,
            name: cubeId === 'keep' ? 'Keep Me' : 'Drop Me',
            mainboard: [],
        });

        const result = selectMembers(manifest, entries, loadRevision);
        expect(result.map((e) => e.cubeId)).toEqual(['keep']);
    });
});

describe('computeDiffs', () => {
    it('1x to 2x Bolt emits exactly one add of bolt+', () => {
        const rev1 = rawRevision({ id: 'rev1', date: 100, mainboard: [{ oracleId: 'bolt' }] });
        const rev2 = rawRevision({ id: 'rev2', date: 200, mainboard: [{ oracleId: 'bolt' }, { oracleId: 'bolt' }] });
        const index = indexWithCoverage('cube1', [{ id: 'rev1', from: 100, to: 100 }, { id: 'rev2', from: 200, to: 200 }]);
        const members: MemberEntry[] = [{ cubeId: 'cube1', index }];
        const loadRevision = (_cubeId: string, id: string) => (id === 'rev1' ? rev1 : rev2);

        const panel = buildPanel({ samples: [100, 200], members, loadRevision, cards, eligibility: new Map(), includeBasics: false });
        const events = computeDiffs(panel);

        expect(events).toEqual([
            { cubeId: 'cube1', date: 200, type: 'add', key: 'bolt+', fromRevision: 'rev1', toRevision: 'rev2' },
        ]);
    });

    it('moving from {A,B} to {B,C} emits add C and remove A dated at the newer revision', () => {
        const panel: Panel = {
            samples: [100, 200],
            cubes: [{ id: 'cube1', name: 'Cube One', owner: 'alice' }],
            grid: [['rev1', 'rev2']],
            revisions: new Map([
                ['rev1', { id: 'rev1', cubeId: 'cube1', date: 100, cards: new Set(['A', 'B']), addedAt: new Map() }],
                ['rev2', { id: 'rev2', cubeId: 'cube1', date: 200, cards: new Set(['B', 'C']), addedAt: new Map() }],
            ]),
            cardInfo: new Map(),
            elo: new Map(),
            unknownCards: 0,
        };

        expect(computeDiffs(panel)).toEqual([
            { cubeId: 'cube1', date: 200, type: 'add', key: 'C', fromRevision: 'rev1', toRevision: 'rev2' },
            { cubeId: 'cube1', date: 200, type: 'remove', key: 'A', fromRevision: 'rev1', toRevision: 'rev2' },
        ]);
    });
});
