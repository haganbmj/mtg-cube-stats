import type { QueryNode } from './CardFilterParser';

// ─────────────────────────────────────────────────────────────────────────────
// Context passed to the evaluator
// ─────────────────────────────────────────────────────────────────────────────

export interface CubeFilterContext {
    /** Cards for this cube (from loadedCubes[id].cards) */
    cards: Array<{ name: string; colors?: string[]; [key: string]: any }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword alias normalization (cube-specific)
// ─────────────────────────────────────────────────────────────────────────────

const CUBE_KEYWORD_ALIASES: Record<string, string> = {
    // Name
    name: 'name',
    n: 'name',
    // Owner
    owner: 'owner',
    // ID
    id: 'id',
    // Category
    category: 'category',
    cat: 'category',
    // Date modified
    modified: 'modified',
    date: 'modified',
    // Followers
    followers: 'followers',
    // Size (raw numeric)
    size: 'size',
    cards: 'size',
    totalcards: 'size',
    // Average CMC
    avgcmc: 'avgcmc',
    cmc: 'avgcmc',
    // Price
    price: 'price',
    usd: 'price',
    tix: 'tix',
    // Similarity
    similarity: 'similarity',
    sim: 'similarity',
    // Elo
    elo: 'elo',
    // Non-evergreen keywords
    keywords: 'keywords',
    kw: 'keywords',
    // Percentage-based card counts
    creatures: 'creatures',
    lands: 'lands',
    new: 'new',
    removal: 'removal',
    tokens: 'tokens',
    ub: 'ub',
    sp: 'sp',
    // Color distribution (percentage of non-land cards)
    white: 'white',
    w: 'white',
    blue: 'blue',
    u: 'blue',
    black: 'black',
    b: 'black',
    red: 'red',
    r: 'red',
    green: 'green',
    g: 'green',
    colorless: 'colorless',
    c: 'colorless',
    multicolor: 'multicolor',
    multi: 'multicolor',
    m: 'multicolor',
    // Playability
    game: 'game',
    in: 'game',
    // Card containment
    card: 'card',
};

function normalizeCubeKeyword(raw: string): string {
    return CUBE_KEYWORD_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison helpers
// ─────────────────────────────────────────────────────────────────────────────

function compareValues(actual: number | undefined | null, op: string, target: number): boolean {
    if (actual == null) return false;
    switch (op) {
        case ':':
        case '=':  return actual === target;
        case '!=': return actual !== target;
        case '<':  return actual < target;
        case '<=': return actual <= target;
        case '>':  return actual > target;
        case '>=': return actual >= target;
        default:   return false;
    }
}

function stripDiacritics(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function compareStrings(actual: string | undefined | null, op: string, target: string): boolean {
    if (actual == null) return false;
    const a = stripDiacritics(actual.toLowerCase());
    const t = stripDiacritics(target.toLowerCase());
    switch (op) {
        case ':':  return a.includes(t);
        case '=':  return a === t;
        case '!=': return a !== t;
        default:   return false;
    }
}

function compareDates(actual: string | undefined | null, op: string, target: string): boolean {
    if (!actual) return false;
    const actualDate = actual.slice(0, 10);
    const targetDate = target.slice(0, 10);
    switch (op) {
        case ':':
        case '=':  return actualDate === targetDate;
        case '!=': return actualDate !== targetDate;
        case '<':  return actualDate < targetDate;
        case '<=': return actualDate <= targetDate;
        case '>':  return actualDate > targetDate;
        case '>=': return actualDate >= targetDate;
        default:   return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Percentage helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPercentage(count: number | undefined, total: number): number {
    if (!count || total === 0) return 0;
    return (count / total) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color distribution key mapping
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_KEYWORD_TO_KEY: Record<string, string> = {
    white: 'W',
    blue: 'U',
    black: 'B',
    red: 'R',
    green: 'G',
    colorless: 'C',
};

// ─────────────────────────────────────────────────────────────────────────────
// Condition evaluation
// ─────────────────────────────────────────────────────────────────────────────

function evaluateCondition(keyword: string, op: string, value: string | number, cube: any, ctx: CubeFilterContext): boolean {
    const normalized = normalizeCubeKeyword(keyword);
    const totalCards = cube.stats?.totalCards || 1;
    const nonLandCards = totalCards - (cube.stats?.landCards || 0);
    const strVal = String(value).toLowerCase();

    switch (normalized) {
        // ── Text fields ──
        case 'name':
            return compareStrings(cube.name, op, String(value));
        case 'owner':
            return compareStrings(cube.owner, op, String(value));
        case 'id':
            return compareStrings(cube.id, op, String(value)) || compareStrings(cube.shortId, op, String(value));
        case 'category': {
            const categories: string[] = cube.stats?.assumedCategories || [];
            return categories.some(cat => compareStrings(cat, op, String(value)));
        }

        // ── Date ──
        case 'modified':
            return compareDates(cube.lastModified, op, String(value));

        // ── Raw numeric ──
        case 'followers':
            return compareValues(cube.followerCount, op, Number(value));
        case 'size':
            return compareValues(cube.stats?.totalCards, op, Number(value));
        case 'avgcmc':
            return compareValues(cube.stats?.averageNonLandCmc, op, Number(value));
        case 'price':
            return compareValues(cube.stats?.totalMinPriceUsd, op, Number(value));
        case 'tix':
            return compareValues(cube.stats?.totalMinPriceTix, op, Number(value));
        case 'similarity':
            return compareValues(cube.avgSimilarityScore, op, Number(value));
        case 'elo':
            return compareValues(cube.stats?.averageElo, op, Number(value));
        case 'keywords':
            return compareValues(cube.stats?.uniqueNonEvergreenKeywords, op, Number(value));

        // ── Percentage-based card counts ──
        case 'creatures':
            return compareValues(getPercentage(cube.stats?.creatureCards, totalCards), op, Number(value));
        case 'lands':
            return compareValues(getPercentage(cube.stats?.landCards, totalCards), op, Number(value));
        case 'new':
            return compareValues(getPercentage(cube.stats?.newCards, totalCards), op, Number(value));
        case 'removal':
            return compareValues(getPercentage(cube.stats?.cardCounts?.removal, totalCards), op, Number(value));
        case 'tokens':
            return compareValues(getPercentage(cube.stats?.cardCounts?.makesTokens, totalCards), op, Number(value));
        case 'ub':
            return compareValues(getPercentage(cube.stats?.cardCounts?.universesBeyond, totalCards), op, Number(value));
        case 'sp':
            return compareValues(getPercentage(cube.stats?.cardCounts?.supplementalProduct, totalCards), op, Number(value));

        // ── Color distribution (percentage of non-land cards) ──
        case 'white':
        case 'blue':
        case 'black':
        case 'red':
        case 'green':
        case 'colorless': {
            const colorKey = COLOR_KEYWORD_TO_KEY[normalized];
            const count = cube.stats?.colorDistribution?.[colorKey] || 0;
            return compareValues(getPercentage(count, nonLandCards), op, Number(value));
        }
        case 'multicolor': {
            // Multicolor is not pre-computed; derive from cards array
            const multiCount = ctx.cards.filter(card => (card.colors?.length ?? 0) >= 2).length;
            return compareValues(getPercentage(multiCount, nonLandCards), op, Number(value));
        }

        // ── Playability ──
        case 'game': {
            const platform = strVal;
            let isPlayable = false;
            if (platform === 'arena') isPlayable = cube.stats?.arenaPlayable === true;
            else if (platform === 'mtgo') isPlayable = cube.stats?.mtgoPlayable === true;
            else if (platform === 'paper') isPlayable = cube.stats?.paperPlayable === true;
            return op === '!=' ? !isPlayable : isPlayable;
        }

        // ── Card containment ──
        case 'card': {
            const cardName = String(value);
            if (op === '=') {
                return ctx.cards.some(card => card.name?.toLowerCase() === cardName.toLowerCase());
            }
            // : operator = substring match
            return ctx.cards.some(card => card.name?.toLowerCase().includes(cardName.toLowerCase()));
        }

        default:
            return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AST tree evaluation (recursive)
// ─────────────────────────────────────────────────────────────────────────────

function evaluateNode(node: QueryNode, cube: any, ctx: CubeFilterContext): boolean {
    switch (node.type) {
        case 'and':
            return evaluateNode(node.left, cube, ctx) && evaluateNode(node.right, cube, ctx);
        case 'or':
            return evaluateNode(node.left, cube, ctx) || evaluateNode(node.right, cube, ctx);
        case 'not':
            return !evaluateNode(node.child, cube, ctx);
        case 'condition':
            return evaluateCondition(node.keyword, node.op, node.value, cube, ctx);
        case 'name':
            // Bare word → name substring match
            return compareStrings(cube.name, ':', String(node.value));
        default:
            return true;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCubeFilter(ast: QueryNode | null, cube: any, ctx: CubeFilterContext): boolean {
    if (!ast) return true;
    return evaluateNode(ast, cube, ctx);
}
