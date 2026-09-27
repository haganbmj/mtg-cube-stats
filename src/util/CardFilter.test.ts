import { describe, it, expect } from 'vitest';
import { parseQuery } from './CardFilterParser';
import { evaluateCard, extractSortDirective } from './CardFilterEvaluator';

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

// ─────────────────────────────────────────────────────────────────────────────
// Color filter — set inclusion operators
// ─────────────────────────────────────────────────────────────────────────────

describe('color filter — subset (<=)', () => {
    // c<=r: cards that are red or colorless (row's color set ⊆ {R})
    it('c<=r matches a mono-red card', () => {
        expect(evaluate('c<=r', makeCard({ effectiveColors: ['R'] }))).toBe(true);
    });
    it('c<=r matches a colorless card (empty colors)', () => {
        expect(evaluate('c<=r', makeCard({ effectiveColors: [] }))).toBe(true);
    });
    it('c<=r matches a colorless card (C marker)', () => {
        expect(evaluate('c<=r', makeCard({ effectiveColors: ['C'] }))).toBe(true);
    });
    it('c<=r does not match a mono-blue card', () => {
        expect(evaluate('c<=r', makeCard({ effectiveColors: ['U'] }))).toBe(false);
    });
    it('c<=r does not match a red-blue card', () => {
        expect(evaluate('c<=r', makeCard({ effectiveColors: ['R', 'U'] }))).toBe(false);
    });
});

describe('color filter — proper subset (<)', () => {
    // c<ur: cards that are mono-red, mono-blue, or colorless (but NOT both together)
    it('c<ur matches a mono-red card', () => {
        expect(evaluate('c<ur', makeCard({ effectiveColors: ['R'] }))).toBe(true);
    });
    it('c<ur matches a mono-blue card', () => {
        expect(evaluate('c<ur', makeCard({ effectiveColors: ['U'] }))).toBe(true);
    });
    it('c<ur matches a colorless card', () => {
        expect(evaluate('c<ur', makeCard({ effectiveColors: [] }))).toBe(true);
    });
    it('c<ur does not match a red-blue card (equal, not proper subset)', () => {
        expect(evaluate('c<ur', makeCard({ effectiveColors: ['U', 'R'] }))).toBe(false);
    });
    it('c<ur does not match a green card (not a subset at all)', () => {
        expect(evaluate('c<ur', makeCard({ effectiveColors: ['G'] }))).toBe(false);
    });
    it('c<ur does not match a red-green card', () => {
        expect(evaluate('c<ur', makeCard({ effectiveColors: ['R', 'G'] }))).toBe(false);
    });
});

describe('color filter — proper superset (>)', () => {
    // c>r: cards that are red plus one or more other colors
    it('c>r matches a red-blue card', () => {
        expect(evaluate('c>r', makeCard({ effectiveColors: ['R', 'U'] }))).toBe(true);
    });
    it('c>r matches a three-color card containing red', () => {
        expect(evaluate('c>r', makeCard({ effectiveColors: ['R', 'U', 'G'] }))).toBe(true);
    });
    it('c>r does not match a mono-red card (equal, not proper superset)', () => {
        expect(evaluate('c>r', makeCard({ effectiveColors: ['R'] }))).toBe(false);
    });
    it('c>r does not match a colorless card', () => {
        expect(evaluate('c>r', makeCard({ effectiveColors: [] }))).toBe(false);
    });
    it('c>r does not match a blue-green card (missing red)', () => {
        expect(evaluate('c>r', makeCard({ effectiveColors: ['U', 'G'] }))).toBe(false);
    });
});

describe('color filter — superset (>=)', () => {
    // c>=r: cards that are red (and possibly more)
    it('c>=r matches a mono-red card', () => {
        expect(evaluate('c>=r', makeCard({ effectiveColors: ['R'] }))).toBe(true);
    });
    it('c>=r matches a red-blue card', () => {
        expect(evaluate('c>=r', makeCard({ effectiveColors: ['R', 'U'] }))).toBe(true);
    });
    it('c>=r does not match a colorless card', () => {
        expect(evaluate('c>=r', makeCard({ effectiveColors: [] }))).toBe(false);
    });
    it('c>=r does not match a mono-blue card', () => {
        expect(evaluate('c>=r', makeCard({ effectiveColors: ['U'] }))).toBe(false);
    });
});

describe('color filter — exact (=) and contains (:) unchanged', () => {
    it('c=r matches only mono-red', () => {
        expect(evaluate('c=r', makeCard({ effectiveColors: ['R'] }))).toBe(true);
        expect(evaluate('c=r', makeCard({ effectiveColors: ['R', 'U'] }))).toBe(false);
    });
    it('c:rg matches a card with both red and green', () => {
        expect(evaluate('c:rg', makeCard({ effectiveColors: ['R', 'G'] }))).toBe(true);
        expect(evaluate('c:rg', makeCard({ effectiveColors: ['R'] }))).toBe(false);
    });
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

describe('split-card mana cost filter', () => {
    // Split cards store manaCost as the top-level Scryfall string with a `//` separator
    // between face costs. The parser's brace-extraction regex skips the separator, so
    // the filter treats splits as the combined multiset of both faces.
    const splitCard = makeCard({
        name: 'Fire // Ice',
        typeLine: 'Instant // Instant',
        layout: 'split',
        colorIdentity: ['U', 'R'],
        manaCost: '{1}{R} // {1}{U}',
        cmc: 4,
    });

    it('matches a face color via mana:', () => {
        expect(evaluate('mana:U', splitCard)).toBe(true);
        expect(evaluate('mana:R', splitCard)).toBe(true);
    });

    it('does not match an absent color', () => {
        expect(evaluate('mana:G', splitCard)).toBe(false);
        expect(evaluate('mana:B', splitCard)).toBe(false);
    });

    it('matches the combined multiset via mana=', () => {
        expect(evaluate('mana={1}{R}{1}{U}', splitCard)).toBe(true);
    });

    it('does not match a single-face-only cost via mana=', () => {
        expect(evaluate('mana={1}{R}', splitCard)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// count / copies / is:singleton
// ─────────────────────────────────────────────────────────────────────────────

describe('count / copies filter', () => {
    it('count>1 matches a card with 2 copies', () => {
        expect(evaluate('count>1', makeCard({ count: 2 }))).toBe(true);
    });
    it('count>1 does not match a card with 1 copy', () => {
        expect(evaluate('count>1', makeCard({ count: 1 }))).toBe(false);
    });
    it('copies>1 matches the same cards as count>1', () => {
        expect(evaluate('copies>1', makeCard({ count: 2 }))).toBe(true);
        expect(evaluate('copies>1', makeCard({ count: 1 }))).toBe(false);
    });
    it('copies=3 matches a card with 3 copies', () => {
        expect(evaluate('copies=3', makeCard({ count: 3 }))).toBe(true);
    });
});

describe('is:singleton / not:singleton', () => {
    it('is:singleton matches a card with count=1', () => {
        expect(evaluate('is:singleton', makeCard({ count: 1 }))).toBe(true);
    });
    it('is:singleton matches a card with no count populated', () => {
        expect(evaluate('is:singleton', makeCard({ count: undefined }))).toBe(true);
    });
    it('is:singleton does not match a card with count=2', () => {
        expect(evaluate('is:singleton', makeCard({ count: 2 }))).toBe(false);
    });
    it('not:singleton matches a card with count>1', () => {
        expect(evaluate('not:singleton', makeCard({ count: 3 }))).toBe(true);
    });
    it('not:singleton does not match a card with count=1', () => {
        expect(evaluate('not:singleton', makeCard({ count: 1 }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Colorless handling for color / coloridentity
// ─────────────────────────────────────────────────────────────────────────────

describe('color filter — colorless as a binary state', () => {
    it('c=c matches a colorless card (empty colors)', () => {
        expect(evaluate('c=c', makeCard({ effectiveColors: [] }))).toBe(true);
    });
    it('c=c matches a colorless card (C marker)', () => {
        expect(evaluate('c=c', makeCard({ effectiveColors: ['C'] }))).toBe(true);
    });
    it('c=c does not match a colored card', () => {
        expect(evaluate('c=c', makeCard({ effectiveColors: ['R'] }))).toBe(false);
    });
    it('c:c behaves the same as c=c (colorless is binary, not a set membership)', () => {
        expect(evaluate('c:c', makeCard({ effectiveColors: [] }))).toBe(true);
        expect(evaluate('c:c', makeCard({ effectiveColors: ['C'] }))).toBe(true);
        expect(evaluate('c:c', makeCard({ effectiveColors: ['R'] }))).toBe(false);
    });
    it('color=colorless is equivalent to c=c', () => {
        expect(evaluate('color=colorless', makeCard({ effectiveColors: [] }))).toBe(true);
        expect(evaluate('color=colorless', makeCard({ effectiveColors: ['R'] }))).toBe(false);
    });
    it('c=c and colors=0 return the same result', () => {
        const colorless = makeCard({ effectiveColors: [] });
        const colored = makeCard({ effectiveColors: ['G'] });
        expect(evaluate('c=c', colorless)).toBe(evaluate('colors=0', colorless));
        expect(evaluate('c=c', colored)).toBe(evaluate('colors=0', colored));
    });
    it('c!=c matches any colored card', () => {
        expect(evaluate('c!=c', makeCard({ effectiveColors: ['R'] }))).toBe(true);
        expect(evaluate('c!=c', makeCard({ effectiveColors: ['W', 'U'] }))).toBe(true);
        expect(evaluate('c!=c', makeCard({ effectiveColors: [] }))).toBe(false);
    });
});

describe('color identity filter — colorless as a binary state', () => {
    it('id=c matches a colorless card (empty identity)', () => {
        expect(evaluate('id=c', makeCard({ effectiveColorIdentity: [] }))).toBe(true);
    });
    it('id=c matches a colorless card (C marker)', () => {
        expect(evaluate('id=c', makeCard({ effectiveColorIdentity: ['C'] }))).toBe(true);
    });
    it('id=c does not match a colored identity', () => {
        expect(evaluate('id=c', makeCard({ effectiveColorIdentity: ['G'] }))).toBe(false);
    });
    it('id:c behaves the same as id=c', () => {
        expect(evaluate('id:c', makeCard({ effectiveColorIdentity: [] }))).toBe(true);
        expect(evaluate('id:c', makeCard({ effectiveColorIdentity: ['C'] }))).toBe(true);
        expect(evaluate('id:c', makeCard({ effectiveColorIdentity: ['G'] }))).toBe(false);
    });
    it('id!=c matches any card with a colored identity', () => {
        expect(evaluate('id!=c', makeCard({ effectiveColorIdentity: ['R'] }))).toBe(true);
        expect(evaluate('id!=c', makeCard({ effectiveColorIdentity: [] }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Text-field filters
// ─────────────────────────────────────────────────────────────────────────────

describe('name filter', () => {
    it('name: matches substring, case-insensitive', () => {
        expect(evaluate('name:bolt', makeCard({ name: 'Lightning Bolt' }))).toBe(true);
        expect(evaluate('name:BOLT', makeCard({ name: 'Lightning Bolt' }))).toBe(true);
        expect(evaluate('name:brainstorm', makeCard({ name: 'Lightning Bolt' }))).toBe(false);
    });
    it('name= requires exact match', () => {
        expect(evaluate('name="Lightning Bolt"', makeCard({ name: 'Lightning Bolt' }))).toBe(true);
        expect(evaluate('name="Lightning"', makeCard({ name: 'Lightning Bolt' }))).toBe(false);
    });
    it('name comparisons strip diacritics', () => {
        expect(evaluate('name:jotun', makeCard({ name: 'Jötun Grunt' }))).toBe(true);
    });
    it('name!= inverts', () => {
        expect(evaluate('name!="Lightning Bolt"', makeCard({ name: 'Counterspell' }))).toBe(true);
        expect(evaluate('name!="Counterspell"', makeCard({ name: 'Counterspell' }))).toBe(false);
    });
});

describe('oracle text filter', () => {
    const card = makeCard({ oracleText: 'Draw a card. Then discard a card.' });

    it('oracle: matches substring', () => {
        expect(evaluate('oracle:draw', card)).toBe(true);
        expect(evaluate('o:discard', card)).toBe(true);
        expect(evaluate('text:sacrifice', card)).toBe(false);
    });
    it('fo: (fulloracle alias) matches substring', () => {
        expect(evaluate('fo:draw', card)).toBe(true);
    });
    it('oracle: on empty text returns false', () => {
        expect(evaluate('oracle:draw', makeCard({ oracleText: undefined }))).toBe(false);
    });
});

describe('type line filter', () => {
    it('t: matches a substring of the type line', () => {
        const creature = makeCard({ typeLine: 'Creature — Human Warrior' });
        expect(evaluate('t:creature', creature)).toBe(true);
        expect(evaluate('type:warrior', creature)).toBe(true);
        expect(evaluate('t:instant', creature)).toBe(false);
    });
});

describe('keyword filter', () => {
    const card = makeCard({ keywords: ['Flying', 'First Strike'] });

    it('kw: does substring match on any keyword entry', () => {
        expect(evaluate('kw:fly', card)).toBe(true);
        expect(evaluate('keyword:first', card)).toBe(true);
        expect(evaluate('kw:trample', card)).toBe(false);
    });
    it('kw= requires an exact match on a keyword entry', () => {
        expect(evaluate('kw="First Strike"', card)).toBe(true);
        expect(evaluate('kw=first', card)).toBe(false);
    });
});

describe('tag filter', () => {
    const card = makeCard({ tags: ['removal', 'draw', 'card advantage'] });

    it('tag: does substring match', () => {
        expect(evaluate('tag:removal', card)).toBe(true);
        expect(evaluate('otag:advantage', card)).toBe(true);
        expect(evaluate('tag:ramp', card)).toBe(false);
    });
    it('tag= requires an exact tag entry', () => {
        expect(evaluate('tag="card advantage"', card)).toBe(true);
        expect(evaluate('tag=card', card)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Numeric fields
// ─────────────────────────────────────────────────────────────────────────────

describe('cmc filter', () => {
    it.each<[string, number, boolean]>([
        ['cmc=3', 3, true],
        ['cmc=2', 3, false],
        ['cmc>=3', 3, true],
        ['cmc>3', 3, false],
        ['cmc<4', 3, true],
        ['cmc<=3', 3, true],
        ['mv=3', 3, true],
        ['manavalue=3', 3, true],
    ])('%s on cmc=%s → %s', (query, cmc, expected) => {
        expect(evaluate(query, makeCard({ cmc }))).toBe(expected);
    });

    it('cmc:even / cmc:odd match by parity', () => {
        expect(evaluate('cmc:even', makeCard({ cmc: 2 }))).toBe(true);
        expect(evaluate('cmc:even', makeCard({ cmc: 3 }))).toBe(false);
        expect(evaluate('cmc:odd', makeCard({ cmc: 3 }))).toBe(true);
        expect(evaluate('cmc:odd', makeCard({ cmc: 2 }))).toBe(false);
    });

    it('cmc returns false when cmc is missing', () => {
        expect(evaluate('cmc=3', makeCard({ cmc: undefined }))).toBe(false);
    });
});

describe('loyalty filter', () => {
    it('loyalty=3 matches a 3-loyalty planeswalker', () => {
        expect(evaluate('loyalty=3', makeCard({ loyalty: '3' }))).toBe(true);
    });
    it('loy>=4 does not match a 3-loyalty card', () => {
        expect(evaluate('loy>=4', makeCard({ loyalty: '3' }))).toBe(false);
    });
    it('loyalty returns false when missing', () => {
        expect(evaluate('loyalty=1', makeCard({ loyalty: undefined }))).toBe(false);
    });
});

describe('wordcount filters', () => {
    const card = makeCard({ oracleTextWordCount: 20, oracleTextWordCountMinusParen: 15 });

    it('wordcount uses text excluding reminder text', () => {
        expect(evaluate('wordcount=15', card)).toBe(true);
        expect(evaluate('wordcount=20', card)).toBe(false);
        expect(evaluate('words<=15', card)).toBe(true);
        expect(evaluate('wc>10', card)).toBe(true);
    });

    it('wordcountreminder includes reminder-text words', () => {
        expect(evaluate('wordcountreminder=20', card)).toBe(true);
        expect(evaluate('wordsrem<25', card)).toBe(true);
        expect(evaluate('wcr>=20', card)).toBe(true);
    });
});

describe('release year filter', () => {
    const card = makeCard({ releaseYear: 2023 });

    it.each<[string, boolean]>([
        ['year=2023', true],
        ['year=2022', false],
        ['year>=2023', true],
        ['year<2023', false],
        ['released=2023', true],
    ])('%s → %s', (query, expected) => {
        expect(evaluate(query, card)).toBe(expected);
    });
});

describe('price / stat filters', () => {
    it.each<[string, Record<string, any>, boolean]>([
        ['usd>=5', { minPriceUsd: 5.5 }, true],
        ['usd<1', { minPriceUsd: 5.5 }, false],
        ['tix<=1', { minPriceTix: 0.5 }, true],
        ['elo>=1500', { elo: 1600 }, true],
        ['elo<1500', { elo: 1600 }, false],
        ['pop>50', { popularity: 75 }, true],
        ['popularity<50', { popularity: 75 }, false],
        ['cubecount>=100', { cubeCount: 250 }, true],
        ['cubes<100', { cubeCount: 250 }, false],
        ['cc>=1', { cubeCount: 5 }, true],
    ])('%s with %j → %s', (query, overrides, expected) => {
        expect(evaluate(query, makeCard(overrides))).toBe(expected);
    });

    it('returns false when the numeric field is null', () => {
        expect(evaluate('usd>=1', makeCard({ minPriceUsd: null }))).toBe(false);
        expect(evaluate('elo>=1500', makeCard({ elo: null }))).toBe(false);
    });
});

describe('globalrate filter', () => {
    it('globalrate compares against the total-rate field', () => {
        const card = makeCard({ globalRatePercent_total: 42 });
        expect(evaluate('globalrate>=40', card)).toBe(true);
        expect(evaluate('gr<40', card)).toBe(false);
        expect(evaluate('global:50', card)).toBe(false);
    });
    it('returns false when the rate is missing', () => {
        expect(evaluate('globalrate>=1', makeCard())).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mana cost and produced mana
// ─────────────────────────────────────────────────────────────────────────────

describe('mana cost filter (single-face)', () => {
    const card = makeCard({ manaCost: '{2}{U}{U}', cmc: 4 });

    it('mana: matches all requested symbols with multiplicity', () => {
        expect(evaluate('mana:UU', card)).toBe(true);
        expect(evaluate('mana:U', card)).toBe(true);
    });
    it('mana: fails when a requested symbol is missing', () => {
        expect(evaluate('mana:UUU', card)).toBe(false);
        expect(evaluate('mana:R', card)).toBe(false);
    });
    it('mana= requires an exact multiset', () => {
        expect(evaluate('mana={2}{U}{U}', card)).toBe(true);
        expect(evaluate('mana={2}{U}', card)).toBe(false);
    });
    it('mana!= inverts', () => {
        expect(evaluate('mana!={2}{U}', card)).toBe(true);
        expect(evaluate('mana!={2}{U}{U}', card)).toBe(false);
    });
    it('mana compare by symbol count', () => {
        expect(evaluate('mana>=3', card)).toBe(true);
        expect(evaluate('mana<3', card)).toBe(false);
    });
});

describe('produces filter', () => {
    it('produces: matches when the card produces the requested colors', () => {
        const dual = makeCard({ producedMana: ['U', 'R'] });
        expect(evaluate('produces:u', dual)).toBe(true);
        expect(evaluate('produces:ur', dual)).toBe(true);
        expect(evaluate('produces:g', dual)).toBe(false);
    });
    it('produces= requires exact multiset (order-insensitive)', () => {
        const dual = makeCard({ producedMana: ['U', 'R'] });
        expect(evaluate('produces=ur', dual)).toBe(true);
        expect(evaluate('produces=u', dual)).toBe(false);
    });
    it('produces<= means the card produces a subset of the requested colors', () => {
        expect(evaluate('produces<=ur', makeCard({ producedMana: ['U'] }))).toBe(true);
        expect(evaluate('produces<=ur', makeCard({ producedMana: ['G'] }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rarity
// ─────────────────────────────────────────────────────────────────────────────

describe('rarity filter', () => {
    it('r:mythic matches only mythics', () => {
        expect(evaluate('r:mythic', makeCard({ minRarity: 'mythic' }))).toBe(true);
        expect(evaluate('r:mythic', makeCard({ minRarity: 'rare' }))).toBe(false);
    });
    it('single-letter aliases work with `:`', () => {
        expect(evaluate('r:c', makeCard({ minRarity: 'common' }))).toBe(true);
        expect(evaluate('r:u', makeCard({ minRarity: 'uncommon' }))).toBe(true);
        expect(evaluate('r:r', makeCard({ minRarity: 'rare' }))).toBe(true);
        expect(evaluate('r:m', makeCard({ minRarity: 'mythic' }))).toBe(true);
    });
    it('comparative operators order common < uncommon < rare < mythic', () => {
        expect(evaluate('r>uncommon', makeCard({ minRarity: 'rare' }))).toBe(true);
        expect(evaluate('r>uncommon', makeCard({ minRarity: 'common' }))).toBe(false);
        expect(evaluate('r>=rare', makeCard({ minRarity: 'mythic' }))).toBe(true);
        expect(evaluate('r<=uncommon', makeCard({ minRarity: 'common' }))).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Set / SetType / Layout / Number
// ─────────────────────────────────────────────────────────────────────────────

describe('set / settype / layout / number filters', () => {
    const card = makeCard({ setCode: 'khm', setType: 'expansion', layout: 'normal', collectorNumber: '15' });

    it('set: matches lowercase code', () => {
        expect(evaluate('set:khm', card)).toBe(true);
        expect(evaluate('e:khm', card)).toBe(true);
        expect(evaluate('s:mh3', card)).toBe(false);
    });
    it('settype: matches value', () => {
        expect(evaluate('settype:expansion', card)).toBe(true);
        expect(evaluate('st:core', card)).toBe(false);
    });
    it('layout: matches value', () => {
        expect(evaluate('layout:normal', card)).toBe(true);
        expect(evaluate('layout:split', card)).toBe(false);
    });
    it('number with a numeric target compares numerically', () => {
        expect(evaluate('number>=10', card)).toBe(true);
        expect(evaluate('cn<15', card)).toBe(false);
    });
    it('number falls back to string comparison for non-numeric values', () => {
        const promo = makeCard({ collectorNumber: '15p' });
        expect(evaluate('number:15p', promo)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Legality / game availability
// ─────────────────────────────────────────────────────────────────────────────

describe('legal filter', () => {
    const card = makeCard({ legality: { modern: true, legacy: true, vintage: false } });

    it('legal: matches truthy legality entries', () => {
        expect(evaluate('legal:modern', card)).toBe(true);
        expect(evaluate('f:legacy', card)).toBe(true);
        expect(evaluate('format:vintage', card)).toBe(false);
    });
    it('legal!= inverts', () => {
        expect(evaluate('legal!=vintage', card)).toBe(true);
        expect(evaluate('legal!=modern', card)).toBe(false);
    });
});

describe('game availability filter', () => {
    it('game: matches an entry in the games array', () => {
        expect(evaluate('game:paper', makeCard({ games: ['paper'] }))).toBe(true);
        expect(evaluate('game:mtgo', makeCard({ games: ['paper', 'mtgo'] }))).toBe(true);
        expect(evaluate('game:arena', makeCard({ games: ['paper'] }))).toBe(false);
    });
    it('game!= inverts', () => {
        expect(evaluate('game!=arena', makeCard({ games: ['paper'] }))).toBe(true);
        expect(evaluate('game!=paper', makeCard({ games: ['paper'] }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cube membership / cubesize / cubecategory / playable in card context
// ─────────────────────────────────────────────────────────────────────────────

describe('cube membership + cube-scoped filters', () => {
    const loadedCubes = {
        'cube-a': {
            name: 'My Peasant Cube',
            shortId: 'pea',
            stats: { totalCards: 360, assumedCategories: ['peasant'], mtgoPlayable: true, arenaPlayable: false, paperPlayable: true },
        },
        'cube-b': {
            name: 'Powered Cube',
            shortId: 'pwr',
            stats: { totalCards: 540, assumedCategories: ['powered'], mtgoPlayable: false, arenaPlayable: false, paperPlayable: true },
        },
    };
    const ctxCubes = { loadedCubes };
    const evalCube = (q: string, card: any) => {
        const { ast, error } = parseQuery(q);
        if (error || !ast) throw new Error(`Parse error for "${q}": ${error}`);
        return evaluateCard(ast, card, ctxCubes);
    };

    it('cube: resolves by name substring', () => {
        expect(evalCube('cube:peasant', makeCard({ cubes: ['cube-a'] }))).toBe(true);
        expect(evalCube('cube:peasant', makeCard({ cubes: ['cube-b'] }))).toBe(false);
    });
    it('cube: resolves by shortId', () => {
        expect(evalCube('cube:pea', makeCard({ cubes: ['cube-a'] }))).toBe(true);
    });
    it('in: is an alias for cube:', () => {
        expect(evalCube('in:powered', makeCard({ cubes: ['cube-b'] }))).toBe(true);
    });
    it('cube: returns false when the card is in no cubes', () => {
        expect(evalCube('cube:peasant', makeCard({ cubes: [] }))).toBe(false);
    });
    it('cubesize compares against the containing cube', () => {
        expect(evalCube('cubesize>=500', makeCard({ cubes: ['cube-b'] }))).toBe(true);
        expect(evalCube('cubesize>=500', makeCard({ cubes: ['cube-a'] }))).toBe(false);
        expect(evalCube('size>=500', makeCard({ cubes: ['cube-b'] }))).toBe(true);
    });
    it('cubecategory matches when any containing cube has the category', () => {
        expect(evalCube('cubecategory:peasant', makeCard({ cubes: ['cube-a'] }))).toBe(true);
        expect(evalCube('category:powered', makeCard({ cubes: ['cube-b'] }))).toBe(true);
        expect(evalCube('cat:peasant', makeCard({ cubes: ['cube-b'] }))).toBe(false);
    });
    it('playable checks the platform flag on the containing cube', () => {
        expect(evalCube('playable:mtgo', makeCard({ cubes: ['cube-a'] }))).toBe(true);
        expect(evalCube('play:arena', makeCard({ cubes: ['cube-a', 'cube-b'] }))).toBe(false);
        expect(evalCube('playable:paper', makeCard({ cubes: ['cube-a'] }))).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// is: / not: flag booleans
// ─────────────────────────────────────────────────────────────────────────────

describe('is: boolean flags', () => {
    it.each<[string, Record<string, any>, boolean]>([
        ['is:ub', { isUniversesBeyond: true }, true],
        ['is:universesbeyond', { isUniversesBeyond: true }, true],
        ['is:sp', { isSupplementalProduct: true }, true],
        ['is:supplemental', { isSupplementalProduct: true }, true],
        ['is:digital', { isDigital: true }, true],
        ['is:promo', { isPromo: true }, true],
        ['is:hybrid', { isHybrid: true }, true],
        ['is:phyrexian', { isPhyrexian: true }, true],
        ['is:reserved', { isReserved: true }, true],
        ['is:booster', { fromBooster: true }, true],
        ['is:custom', { isCustomCard: true }, true],
        ['is:ub', {}, false],
        ['is:hybrid', {}, false],
    ])('%s on %j → %s', (query, overrides, expected) => {
        expect(evaluate(query, makeCard(overrides))).toBe(expected);
    });

    it('layout-derived flags', () => {
        expect(evaluate('is:dfc', makeCard({ layout: 'transform' }))).toBe(true);
        expect(evaluate('is:dfc', makeCard({ layout: 'modal_dfc' }))).toBe(true);
        expect(evaluate('is:dfc', makeCard({ layout: 'reversible_card' }))).toBe(true);
        expect(evaluate('is:dfc', makeCard({ layout: 'normal' }))).toBe(false);
        expect(evaluate('is:mdfc', makeCard({ layout: 'modal_dfc' }))).toBe(true);
        expect(evaluate('is:mdfc', makeCard({ layout: 'transform' }))).toBe(false);
        expect(evaluate('is:tdfc', makeCard({ layout: 'transform' }))).toBe(true);
        expect(evaluate('is:transform', makeCard({ layout: 'transform' }))).toBe(true);
        expect(evaluate('is:split', makeCard({ layout: 'split' }))).toBe(true);
        expect(evaluate('is:flip', makeCard({ layout: 'flip' }))).toBe(true);
        expect(evaluate('is:meld', makeCard({ layout: 'meld' }))).toBe(true);
        expect(evaluate('is:leveler', makeCard({ layout: 'leveler' }))).toBe(true);
    });

    it('is:vanilla requires a Creature with no oracle text', () => {
        const vanilla = makeCard({ effectiveTypes: ['Creature'], oracleText: '' });
        const withText = makeCard({ effectiveTypes: ['Creature'], oracleText: 'Flying' });
        const nonCreature = makeCard({ effectiveTypes: ['Instant'], oracleText: '' });
        expect(evaluate('is:vanilla', vanilla)).toBe(true);
        expect(evaluate('is:vanilla', withText)).toBe(false);
        expect(evaluate('is:vanilla', nonCreature)).toBe(false);
    });

    it('is:spell rejects only land type lines', () => {
        expect(evaluate('is:spell', makeCard({ typeLine: 'Creature' }))).toBe(true);
        expect(evaluate('is:spell', makeCard({ typeLine: 'Basic Land — Forest' }))).toBe(false);
    });

    it('is:permanent matches all permanent type lines', () => {
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Creature' }))).toBe(true);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Artifact' }))).toBe(true);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Enchantment' }))).toBe(true);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Basic Land — Forest' }))).toBe(true);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Planeswalker' }))).toBe(true);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Battle' }))).toBe(true);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Instant' }))).toBe(false);
        expect(evaluate('is:permanent', makeCard({ typeLine: 'Sorcery' }))).toBe(false);
    });

    it('is:commander requires legendary + creature-or-planeswalker', () => {
        const legendaryCreature = makeCard({ typeLine: 'Legendary Creature — Elf', effectiveTypes: ['Creature'] });
        const legendaryPW = makeCard({ typeLine: 'Legendary Planeswalker — Chandra', effectiveTypes: ['Planeswalker'] });
        const legendaryArtifact = makeCard({ typeLine: 'Legendary Artifact', effectiveTypes: ['Artifact'] });
        expect(evaluate('is:commander', legendaryCreature)).toBe(true);
        expect(evaluate('is:commander', legendaryPW)).toBe(true);
        expect(evaluate('is:commander', legendaryArtifact)).toBe(false);
    });

    it('tag-shorthand flags read row.tags', () => {
        const removal = makeCard({ tags: ['removal'] });
        expect(evaluate('is:removal', removal)).toBe(true);
        expect(evaluate('is:draw', makeCard({ tags: ['draw'] }))).toBe(true);
        expect(evaluate('is:ramp', makeCard({ tags: ['ramp'] }))).toBe(true);
        expect(evaluate('is:counterspell', makeCard({ tags: ['counterspell'] }))).toBe(true);
        expect(evaluate('is:flicker', makeCard({ tags: ['flicker'] }))).toBe(true);
        expect(evaluate('is:tutor', makeCard({ tags: ['tutor'] }))).toBe(true);
        expect(evaluate('is:removal', makeCard({ tags: [] }))).toBe(false);
    });

    it('unknown is: flag returns false', () => {
        expect(evaluate('is:notarealflag', makeCard())).toBe(false);
    });
});

describe('not: boolean flags', () => {
    it('not:hybrid is the inverse of is:hybrid', () => {
        expect(evaluate('not:hybrid', makeCard({ isHybrid: false }))).toBe(true);
        expect(evaluate('not:hybrid', makeCard({ isHybrid: true }))).toBe(false);
    });
    it('not:removal is the inverse of is:removal', () => {
        expect(evaluate('not:removal', makeCard({ tags: [] }))).toBe(true);
        expect(evaluate('not:removal', makeCard({ tags: ['removal'] }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Visual-only / structural keywords never filter rows out
// ─────────────────────────────────────────────────────────────────────────────

describe('highlight / order / direction never filter rows', () => {
    const card = makeCard();

    it('highlight: is a visual annotation; always matches', () => {
        expect(evaluate('highlight:cube-a', card)).toBe(true);
    });
    it('order: never excludes rows', () => {
        expect(evaluate('order:cmc', card)).toBe(true);
        expect(evaluate('sort:name', card)).toBe(true);
    });
    it('dir: never excludes rows', () => {
        expect(evaluate('dir:asc', card)).toBe(true);
        expect(evaluate('direction:desc', card)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boolean composition
// ─────────────────────────────────────────────────────────────────────────────

describe('boolean composition', () => {
    const card = makeCard({ typeLine: 'Creature — Elf', effectiveColors: ['G'], cmc: 2, power: '2', toughness: '2' });

    it('implicit AND requires both', () => {
        expect(evaluate('t:creature cmc<=3', card)).toBe(true);
        expect(evaluate('t:creature cmc<=1', card)).toBe(false);
    });
    it('`or` matches either side', () => {
        expect(evaluate('t:instant or cmc<=3', card)).toBe(true);
        expect(evaluate('t:instant or cmc<=1', card)).toBe(false);
    });
    it('leading `-` negates a criterion', () => {
        expect(evaluate('-t:instant', card)).toBe(true);
        expect(evaluate('-t:creature', card)).toBe(false);
    });
    it('parenthesized subexpressions group correctly', () => {
        expect(evaluate('(t:instant or cmc<=3) c=g', card)).toBe(true);
        expect(evaluate('(t:instant or cmc<=1) c=g', card)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractSortDirective
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSortDirective', () => {
    function extract(query: string) {
        const { ast } = parseQuery(query);
        return extractSortDirective(ast);
    }

    it('returns null when no order:/dir: is present', () => {
        expect(extract('t:creature')).toBeNull();
    });

    it('maps order:cmc to the cmc prop with ascending default', () => {
        expect(extract('order:cmc')).toEqual({
            prop: 'cmc',
            order: 'ascending',
            hasOrder: true,
            hasDirection: false,
        });
    });

    it('respects an explicit dir: override', () => {
        expect(extract('order:cmc dir:desc')).toEqual({
            prop: 'cmc',
            order: 'descending',
            hasOrder: true,
            hasDirection: true,
        });
    });

    it('order aliases resolve to the same prop', () => {
        expect(extract('order:mv')?.prop).toBe('cmc');
        expect(extract('order:manavalue')?.prop).toBe('cmc');
        expect(extract('order:cubes')?.prop).toBe('cubeCount');
        expect(extract('order:price')?.prop).toBe('minPriceUsd');
    });

    it('unknown order value returns null', () => {
        expect(extract('order:notarealkey')).toBeNull();
    });

    it('dir: alone returns a directive with empty prop and default ascending', () => {
        expect(extract('dir:desc')).toEqual({
            prop: '',
            order: 'descending',
            hasOrder: false,
            hasDirection: true,
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('edge cases', () => {
    it('null AST matches every card', () => {
        expect(evaluateCard(null, makeCard(), ctx)).toBe(true);
    });
    it('unknown keywords reject the row', () => {
        expect(evaluate('notarealkeyword:foo', makeCard())).toBe(false);
    });
});
