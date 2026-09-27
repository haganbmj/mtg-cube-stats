import { describe, it, expect } from 'vitest';
import { parseQuery } from './CardFilterParser';
import { evaluateCubeFilter, extractCubeSortDirective } from './CubeFilterEvaluator';

function makeCube(overrides: Record<string, any> = {}): any {
    const { stats: statsOverride, ...rest } = overrides;
    return {
        id: 'cube-1',
        shortId: 'tst',
        name: 'Test Cube',
        owner: 'tester',
        lastModified: '2025-06-01T00:00:00.000Z',
        followerCount: 42,
        avgSimilarityScore: 0.6,
        stats: {
            totalCards: 540,
            landCards: 90,
            creatureCards: 200,
            newCards: 30,
            averageNonLandCmc: 2.8,
            averageElo: 1400,
            uniqueNonEvergreenKeywords: 25,
            totalMinPriceUsd: 500,
            totalMinPriceTix: 100,
            assumedCategories: ['peasant', 'powered'],
            colorDistribution: { W: 90, U: 90, B: 90, R: 90, G: 90, C: 0 },
            arenaPlayable: false,
            mtgoPlayable: true,
            paperPlayable: true,
            cardCounts: {
                removal: 60,
                makesTokens: 40,
                universesBeyond: 20,
                supplementalProduct: 10,
            },
            ...statsOverride,
        },
        ...rest,
    };
}

function evaluate(query: string, cube: any, ctx: any = { cards: [] }): boolean {
    const { ast, error } = parseQuery(query);
    if (error || !ast) throw new Error(`Parse error for "${query}": ${error}`);
    return evaluateCubeFilter(ast, cube, ctx);
}

const emptyCtx = { cards: [] };

// ─────────────────────────────────────────────────────────────────────────────
// Size aliases (regression tests for the parser/evaluator alias mismatch)
// ─────────────────────────────────────────────────────────────────────────────

describe('cube size filter aliases', () => {
    it.each([
        ['size>500'],
        ['cards>500'],
        ['totalcards>500'],
        ['cubesize>500'],
    ])('%s matches only cubes with more than 500 cards', (query) => {
        expect(evaluate(query, makeCube({ stats: { totalCards: 540 } }))).toBe(true);
        expect(evaluate(query, makeCube({ stats: { totalCards: 360 } }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Text fields
// ─────────────────────────────────────────────────────────────────────────────

describe('text field filters', () => {
    it('name: matches substring', () => {
        expect(evaluate('name:test', makeCube({ name: 'A Test Cube' }))).toBe(true);
        expect(evaluate('name:other', makeCube({ name: 'A Test Cube' }))).toBe(false);
    });

    it('owner: matches substring', () => {
        expect(evaluate('owner:tes', makeCube({ owner: 'tester' }))).toBe(true);
        expect(evaluate('owner:foo', makeCube({ owner: 'tester' }))).toBe(false);
    });

    // The shared parser rewrites `id:` to `coloridentity` for the card-tab filter, so the
    // cube evaluator's `case 'id'` arm is currently unreachable — no test for it here.

    it('text comparisons are case- and diacritic-insensitive', () => {
        expect(evaluate('name:cafe', makeCube({ name: 'Café Cube' }))).toBe(true);
        expect(evaluate('name:CUBE', makeCube({ name: 'Test Cube' }))).toBe(true);
    });

    it('bare word matches name or owner', () => {
        expect(evaluate('tester', makeCube({ name: 'Something', owner: 'tester' }))).toBe(true);
        expect(evaluate('cube', makeCube({ name: 'Test Cube', owner: 'someone' }))).toBe(true);
        expect(evaluate('nomatch', makeCube({ name: 'Test Cube', owner: 'tester' }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────────────────────────────────────

describe('category filter', () => {
    it('category: matches any assumed category', () => {
        expect(evaluate('category:peasant', makeCube())).toBe(true);
        expect(evaluate('cat:powered', makeCube())).toBe(true);
        expect(evaluate('category:pauper', makeCube())).toBe(false);
    });

    it('returns false when there are no categories', () => {
        expect(evaluate('category:peasant', makeCube({ stats: { assumedCategories: [] } }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date (modified)
// ─────────────────────────────────────────────────────────────────────────────

describe('modified date filter', () => {
    const cube = makeCube({ lastModified: '2025-06-01T00:00:00.000Z' });

    it('modified>=YYYY-MM-DD', () => {
        expect(evaluate('modified>=2025-01-01', cube)).toBe(true);
        expect(evaluate('modified>=2026-01-01', cube)).toBe(false);
    });

    it('date:YYYY-MM-DD (alias)', () => {
        expect(evaluate('date:2025-06-01', cube)).toBe(true);
        expect(evaluate('date:2025-06-02', cube)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Raw numeric fields
// ─────────────────────────────────────────────────────────────────────────────

describe('raw numeric filters', () => {
    const cube = makeCube();

    it.each<[string, boolean]>([
        ['followers>=40', true],
        ['followers>100', false],
        ['avgcmc<=3', true],
        ['cmc<2', false],
        ['price<=500', true],
        ['usd>1000', false],
        ['tix>=100', true],
        ['tix>200', false],
        ['sim>=0.5', true],
        ['similarity<0.5', false],
        ['elo>=1400', true],
        ['elo>2000', false],
        ['keywords>=20', true],
        ['kw>50', false],
    ])('%s → %s', (query, expected) => {
        expect(evaluate(query, cube)).toBe(expected);
    });

    it('returns false when the underlying value is missing', () => {
        const bare = makeCube({ followerCount: undefined, stats: { totalCards: 540 } });
        expect(evaluate('followers>=1', bare)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Percentage-based card counts
// ─────────────────────────────────────────────────────────────────────────────

describe('percentage-based filters', () => {
    // 540 total → creatures 37%, lands 16.7%, new 5.6%, removal 11.1%, tokens 7.4%, ub 3.7%, sp 1.85%
    const cube = makeCube();

    it.each<[string, boolean]>([
        ['creatures>=30', true],
        ['creatures>50', false],
        ['lands>=15', true],
        ['lands>25', false],
        ['new<=10', true],
        ['new>10', false],
        ['removal>=10', true],
        ['tokens<10', true],
        ['ub<=5', true],
        ['sp<5', true],
    ])('%s → %s', (query, expected) => {
        expect(evaluate(query, cube)).toBe(expected);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Color distribution (percent of non-land cards)
// ─────────────────────────────────────────────────────────────────────────────

describe('color distribution filters', () => {
    // 540 total - 90 lands = 450 non-land; each color 90/450 = 20%.
    const cube = makeCube();

    it.each<[string, boolean]>([
        ['white>=20', true],
        ['w<20', false],
        ['blue>=20', true],
        ['u>25', false],
        ['black:20', true],
        ['red<=20', true],
        ['green>19', true],
        ['colorless=0', true],
        ['c>0', false],
    ])('%s → %s', (query, expected) => {
        expect(evaluate(query, cube)).toBe(expected);
    });

    it('multicolor is derived from ctx.cards', () => {
        const cards = [
            { name: 'Mono W', colors: ['W'] },
            { name: 'Mono U', colors: ['U'] },
            { name: 'Azorius', colors: ['W', 'U'] },
            { name: 'Naya', colors: ['R', 'G', 'W'] },
        ];
        // 2 multi of 450 non-land = 0.44%.
        expect(evaluate('multicolor>=0.4', makeCube(), { cards })).toBe(true);
        expect(evaluate('multi>=1', makeCube(), { cards })).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Playability (game:)
// ─────────────────────────────────────────────────────────────────────────────

describe('playability filter', () => {
    const cube = makeCube();

    it('matches playable platforms', () => {
        expect(evaluate('game:paper', cube)).toBe(true);
        expect(evaluate('game:mtgo', cube)).toBe(true);
    });

    it('does not match unplayable platforms', () => {
        expect(evaluate('game:arena', cube)).toBe(false);
    });

    it('game!= inverts the match', () => {
        expect(evaluate('game!=arena', cube)).toBe(true);
        expect(evaluate('game!=paper', cube)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Card containment (card:)
// ─────────────────────────────────────────────────────────────────────────────

describe('card containment filter', () => {
    const ctx = {
        cards: [
            { name: 'Lightning Bolt', colors: ['R'] },
            { name: 'Counterspell', colors: ['U'] },
            { name: 'Sol Ring', colors: [] },
        ],
    };

    it('card: does substring match', () => {
        expect(evaluate('card:light', makeCube(), ctx)).toBe(true);
        expect(evaluate('card:bolt', makeCube(), ctx)).toBe(true);
        expect(evaluate('card:brainstorm', makeCube(), ctx)).toBe(false);
    });

    it('card= does exact-name match', () => {
        expect(evaluate('card="Lightning Bolt"', makeCube(), ctx)).toBe(true);
        expect(evaluate('card="Lightning"', makeCube(), ctx)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────────────────────────────────────

describe('checks filter', () => {
    const cube = makeCube();

    it('reads checksPassCount from context', () => {
        expect(evaluate('checks>=3', cube, { cards: [], checksPassCount: 5 })).toBe(true);
        expect(evaluate('checks>=3', cube, { cards: [], checksPassCount: 1 })).toBe(false);
    });

    it('treats missing checksPassCount as 0', () => {
        expect(evaluate('checks>=1', cube)).toBe(false);
        expect(evaluate('checks=0', cube)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sort directives never filter rows out
// ─────────────────────────────────────────────────────────────────────────────

describe('sort directives (order: / dir:)', () => {
    const cube = makeCube();

    it('order: alone does not exclude any cube', () => {
        expect(evaluate('order:size', cube)).toBe(true);
        expect(evaluate('order:name', cube)).toBe(true);
    });

    it('dir: alone does not exclude any cube', () => {
        expect(evaluate('dir:asc', cube)).toBe(true);
        expect(evaluate('direction:desc', cube)).toBe(true);
    });

    it('combined with a real filter, still applies the filter', () => {
        expect(evaluate('order:size size>500', makeCube({ stats: { totalCards: 540 } }))).toBe(true);
        expect(evaluate('order:size size>500', makeCube({ stats: { totalCards: 360 } }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boolean composition (AND, OR, NOT)
// ─────────────────────────────────────────────────────────────────────────────

describe('boolean composition', () => {
    const cube = makeCube({ stats: { totalCards: 540, landCards: 90, creatureCards: 200, newCards: 30 } });

    it('implicit AND requires both to match', () => {
        expect(evaluate('size>=500 lands<25', cube)).toBe(true);
        expect(evaluate('size>=500 lands<10', cube)).toBe(false);
    });

    it('or matches if either side matches', () => {
        expect(evaluate('size<100 or lands<25', cube)).toBe(true);
        expect(evaluate('size<100 or lands<10', cube)).toBe(false);
    });

    it('negation with leading `-`', () => {
        expect(evaluate('-name:other', cube)).toBe(true);
        expect(evaluate('-name:cube', cube)).toBe(false);
    });

    it('parenthesized subexpressions', () => {
        expect(evaluate('(size>=500 or lands>50) name:test', cube)).toBe(true);
        expect(evaluate('(size<100 or lands>50) name:test', cube)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('edge cases', () => {
    it('null AST matches every cube', () => {
        expect(evaluateCubeFilter(null, makeCube(), emptyCtx)).toBe(true);
    });

    it('unknown keywords reject the cube', () => {
        expect(evaluate('doesnotexist:foo', makeCube())).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractCubeSortDirective
// ─────────────────────────────────────────────────────────────────────────────

describe('extractCubeSortDirective', () => {
    function extract(query: string) {
        const { ast } = parseQuery(query);
        return extractCubeSortDirective(ast);
    }

    it('returns null when neither order: nor dir: is present', () => {
        expect(extract('size>=500')).toBeNull();
    });

    it('maps order:size to stats.totalCards with default descending', () => {
        expect(extract('order:size')).toEqual({
            prop: 'stats.totalCards',
            order: 'descending',
            hasOrder: true,
            hasDirection: false,
        });
    });

    it('order:cards resolves to the same prop as order:size', () => {
        expect(extract('order:cards')?.prop).toBe('stats.totalCards');
    });

    it('applies explicit direction override', () => {
        expect(extract('order:size dir:asc')).toEqual({
            prop: 'stats.totalCards',
            order: 'ascending',
            hasOrder: true,
            hasDirection: true,
        });
    });

    it('dir: alone still returns a directive (with empty prop)', () => {
        expect(extract('dir:desc')).toEqual({
            prop: '',
            order: 'descending',
            hasOrder: false,
            hasDirection: true,
        });
    });

    it('returns null when order: value is not a known sort key', () => {
        expect(extract('order:garbage')).toBeNull();
    });
});
