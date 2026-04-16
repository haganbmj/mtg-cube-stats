import { describe, it, expect } from 'vitest';
import { parseQuery } from './CardFilterParser';
import { evaluateCard } from './CardFilterEvaluator';

// ─────────────────────────────────────────────────────────────────────────────
// Minimal card row fixture factory
// ─────────────────────────────────────────────────────────────────────────────

function makeCard(overrides: Record<string, any> = {}): any {
    return {
        oracleId: 'test-oracle-id',
        name: 'Test Creature',
        cmc: 3,
        typeLine: 'Creature — Human Warrior',
        effectiveTypes: ['Creature'],
        colorIdentity: ['R'],
        oracleText: 'First strike',
        oracleTextWordCount: 2,
        oracleTextWordCountMinusParen: 2,
        keywords: ['First Strike'],
        rarity: 'common',
        minRarity: 'common',
        setCode: 'TST',
        setType: 'expansion',
        layout: 'normal',
        power: '3',
        toughness: '2',
        tags: [],
        games: ['paper'],
        legality: {},
        cubes: [],
        cubeCount: 0,
        count: 1,
        elo: null,
        popularity: null,
        minPriceUsd: null,
        minPriceTix: null,
        releaseDate: '2020-09-25',
        releaseYear: 2020,
        ...overrides,
    };
}

const ctx = { loadedCubes: {} };
const ctxWithSets = { loadedCubes: {}, setDates: { khm: '2021-02-05', mh3: '2024-06-14', ltr: '2023-06-23' } };

function evaluate(query: string, card: any): boolean {
    const { ast, error } = parseQuery(query);
    if (error || !ast) throw new Error(`Parse error for "${query}": ${error}`);
    return evaluateCard(ast, card, ctx);
}

function evaluateWithSets(query: string, card: any): boolean {
    const { ast, error } = parseQuery(query);
    if (error || !ast) throw new Error(`Parse error for "${query}": ${error}`);
    return evaluateCard(ast, card, ctxWithSets);
}

// ─────────────────────────────────────────────────────────────────────────────
// Power filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('power filter', () => {
    const card = makeCard({ power: '3', toughness: '2' });

    it('pow=3 matches', () => expect(evaluate('pow=3', card)).toBe(true));
    it('pow=4 does not match', () => expect(evaluate('pow=4', card)).toBe(false));
    it('pow>2 matches', () => expect(evaluate('pow>2', card)).toBe(true));
    it('pow>=3 matches', () => expect(evaluate('pow>=3', card)).toBe(true));
    it('pow>=4 does not match', () => expect(evaluate('pow>=4', card)).toBe(false));
    it('pow<4 matches', () => expect(evaluate('pow<4', card)).toBe(true));
    it('pow<=3 matches', () => expect(evaluate('pow<=3', card)).toBe(true));
    it('pow!=4 matches', () => expect(evaluate('pow!=4', card)).toBe(true));
    it('pow!=3 does not match', () => expect(evaluate('pow!=3', card)).toBe(false));
    it('power=3 (long alias) matches', () => expect(evaluate('power=3', card)).toBe(true));
});

// ─────────────────────────────────────────────────────────────────────────────
// Toughness filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('toughness filter', () => {
    const card = makeCard({ power: '3', toughness: '2' });

    it('tou=2 matches', () => expect(evaluate('tou=2', card)).toBe(true));
    it('tou=3 does not match', () => expect(evaluate('tou=3', card)).toBe(false));
    it('tou>1 matches', () => expect(evaluate('tou>1', card)).toBe(true));
    it('tou>=2 matches', () => expect(evaluate('tou>=2', card)).toBe(true));
    it('tou<3 matches', () => expect(evaluate('tou<3', card)).toBe(true));
    it('toughness=2 (long alias) matches', () => expect(evaluate('toughness=2', card)).toBe(true));
});

// ─────────────────────────────────────────────────────────────────────────────
// Total power + toughness (pt)
// ─────────────────────────────────────────────────────────────────────────────

describe('pt (total power+toughness) filter', () => {
    const card = makeCard({ power: '3', toughness: '2' }); // total = 5

    it('pt=5 matches', () => expect(evaluate('pt=5', card)).toBe(true));
    it('pt=6 does not match', () => expect(evaluate('pt=6', card)).toBe(false));
    it('pt>=5 matches', () => expect(evaluate('pt>=5', card)).toBe(true));
    it('pt>4 matches', () => expect(evaluate('pt>4', card)).toBe(true));
    it('pt<6 matches', () => expect(evaluate('pt<6', card)).toBe(true));
    it('powtou=5 (alias) matches', () => expect(evaluate('powtou=5', card)).toBe(true));
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-field comparison (pow vs tou)
// ─────────────────────────────────────────────────────────────────────────────

describe('cross-field power/toughness comparison', () => {
    it('pow>tou matches when power > toughness (3/2)', () => {
        expect(evaluate('pow>tou', makeCard({ power: '3', toughness: '2' }))).toBe(true);
    });
    it('pow>tou does not match when power == toughness (2/2)', () => {
        expect(evaluate('pow>tou', makeCard({ power: '2', toughness: '2' }))).toBe(false);
    });
    it('pow>tou does not match when power < toughness (1/4)', () => {
        expect(evaluate('pow>tou', makeCard({ power: '1', toughness: '4' }))).toBe(false);
    });
    it('tou>pow matches when toughness > power (1/4)', () => {
        expect(evaluate('tou>pow', makeCard({ power: '1', toughness: '4' }))).toBe(true);
    });
    it('pow=tou matches when equal (2/2)', () => {
        expect(evaluate('pow=tou', makeCard({ power: '2', toughness: '2' }))).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-numeric power values (*, 1+*)
// ─────────────────────────────────────────────────────────────────────────────

describe('non-numeric power/toughness values', () => {
    it('pow=3 does not match a */5 card', () => {
        expect(evaluate('pow=3', makeCard({ power: '*', toughness: '5' }))).toBe(false);
    });
    it('pow>0 does not match a 1+*/1 card (non-parseable)', () => {
        expect(evaluate('pow>0', makeCard({ power: '1+*', toughness: '1' }))).toBe(false);
    });
    it('pt=5 does not match when power is * (non-parseable total)', () => {
        expect(evaluate('pt=5', makeCard({ power: '*', toughness: '5' }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-creature cards (no power/toughness)
// ─────────────────────────────────────────────────────────────────────────────

describe('non-creature cards', () => {
    const spell = makeCard({ typeLine: 'Instant', power: undefined, toughness: undefined });

    it('pow=3 does not match a card with no power', () => {
        expect(evaluate('pow=3', spell)).toBe(false);
    });
    it('tou>=1 does not match a card with no toughness', () => {
        expect(evaluate('tou>=1', spell)).toBe(false);
    });
    it('pt=0 does not match a card with no power/toughness', () => {
        expect(evaluate('pt=0', spell)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Combined queries
// ─────────────────────────────────────────────────────────────────────────────

describe('combined queries', () => {
    it('t:creature pow>=3 matches a 3/2 creature', () => {
        expect(evaluate('t:creature pow>=3', makeCard({ power: '3', toughness: '2' }))).toBe(true);
    });
    it('t:creature pow>=4 does not match a 3/2 creature', () => {
        expect(evaluate('t:creature pow>=4', makeCard({ power: '3', toughness: '2' }))).toBe(false);
    });
    it('pow>=3 tou>=3 matches a 4/4 card', () => {
        expect(evaluate('pow>=3 tou>=3', makeCard({ power: '4', toughness: '4' }))).toBe(true);
    });
    it('pow>=3 tou>=3 does not match a 4/2 card', () => {
        expect(evaluate('pow>=3 tou>=3', makeCard({ power: '4', toughness: '2' }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date filtering — year, ISO date, set code, now/today
// ─────────────────────────────────────────────────────────────────────────────

describe('date filter — year comparisons', () => {
    const card = makeCard({ releaseDate: '2020-09-25', releaseYear: 2020 });

    it('date:2020 matches', () => expect(evaluate('date:2020', card)).toBe(true));
    it('date=2020 matches', () => expect(evaluate('date=2020', card)).toBe(true));
    it('date=2021 does not match', () => expect(evaluate('date=2021', card)).toBe(false));
    it('date>=2020 matches', () => expect(evaluate('date>=2020', card)).toBe(true));
    it('date>=2021 does not match', () => expect(evaluate('date>=2021', card)).toBe(false));
    it('date>2019 matches', () => expect(evaluate('date>2019', card)).toBe(true));
    it('date>2020 does not match', () => expect(evaluate('date>2020', card)).toBe(false));
    it('date<=2020 matches', () => expect(evaluate('date<=2020', card)).toBe(true));
    it('date<2021 matches', () => expect(evaluate('date<2021', card)).toBe(true));
    it('date!=2021 matches', () => expect(evaluate('date!=2021', card)).toBe(true));
    it('date!=2020 does not match', () => expect(evaluate('date!=2020', card)).toBe(false));
});

describe('date filter — ISO date comparisons', () => {
    const card = makeCard({ releaseDate: '2020-09-25', releaseYear: 2020 });

    it('date=2020-09-25 matches', () => expect(evaluate('date=2020-09-25', card)).toBe(true));
    it('date=2020-09-26 does not match', () => expect(evaluate('date=2020-09-26', card)).toBe(false));
    it('date>=2020-09-25 matches', () => expect(evaluate('date>=2020-09-25', card)).toBe(true));
    it('date>2020-09-24 matches', () => expect(evaluate('date>2020-09-24', card)).toBe(true));
    it('date>2020-09-25 does not match', () => expect(evaluate('date>2020-09-25', card)).toBe(false));
    it('date<2020-09-26 matches', () => expect(evaluate('date<2020-09-26', card)).toBe(true));
    it('date<=2020-09-25 matches', () => expect(evaluate('date<=2020-09-25', card)).toBe(true));
    it('date!=2020-09-26 matches', () => expect(evaluate('date!=2020-09-26', card)).toBe(true));
});

describe('date filter — set code resolution', () => {
    // Card released before KHM (2021-02-05)
    const oldCard = makeCard({ releaseDate: '2019-01-25', releaseYear: 2019 });
    // Card released same day as KHM
    const khmCard = makeCard({ releaseDate: '2021-02-05', releaseYear: 2021 });
    // Card released after MH3 (2024-06-14)
    const newCard = makeCard({ releaseDate: '2024-11-08', releaseYear: 2024 });

    it('date>khm matches card released after KHM', () => expect(evaluateWithSets('date>khm', newCard)).toBe(true));
    it('date>khm does not match card released before KHM', () => expect(evaluateWithSets('date>khm', oldCard)).toBe(false));
    it('date>=khm matches card released on KHM release day', () => expect(evaluateWithSets('date>=khm', khmCard)).toBe(true));
    it('date<khm matches card released before KHM', () => expect(evaluateWithSets('date<khm', oldCard)).toBe(true));
    it('date<khm does not match card released on KHM release day', () => expect(evaluateWithSets('date<khm', khmCard)).toBe(false));
    it('date=khm matches exact release date', () => expect(evaluateWithSets('date=khm', khmCard)).toBe(true));
    it('date>mh3 matches card released after MH3', () => expect(evaluateWithSets('date>mh3', newCard)).toBe(true));
    it('date>mh3 does not match card released before MH3', () => expect(evaluateWithSets('date>mh3', oldCard)).toBe(false));
});

describe('date filter — now/today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayYear = new Date().getFullYear();

    it('date<=now matches a card released in the past', () => {
        expect(evaluateWithSets('date<=now', makeCard({ releaseDate: '2020-01-01', releaseYear: 2020 }))).toBe(true);
    });
    it('date>now does not match a card released in the past', () => {
        expect(evaluateWithSets('date>now', makeCard({ releaseDate: '2020-01-01', releaseYear: 2020 }))).toBe(false);
    });
    it('date=now matches a card released today', () => {
        expect(evaluateWithSets('date=now', makeCard({ releaseDate: today, releaseYear: todayYear }))).toBe(true);
    });
    it('date<=today matches a card released in the past (today alias)', () => {
        expect(evaluateWithSets('date<=today', makeCard({ releaseDate: '2015-06-19', releaseYear: 2015 }))).toBe(true);
    });
});
