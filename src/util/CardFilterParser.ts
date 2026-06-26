import nearley from 'nearley';
import grammar from './cardFilters.grammar';

// ─────────────────────────────────────────────────────────────────────────────
// AST node types
// ─────────────────────────────────────────────────────────────────────────────

export interface AndNode {
    type: 'and';
    left: QueryNode;
    right: QueryNode;
}

export interface OrNode {
    type: 'or';
    left: QueryNode;
    right: QueryNode;
}

export interface NotNode {
    type: 'not';
    child: QueryNode;
}

export interface ConditionNode {
    type: 'condition';
    keyword: string;
    op: string;
    value: string | number;
}

export interface NameNode {
    type: 'name';
    value: string;
}

export type QueryNode = AndNode | OrNode | NotNode | ConditionNode | NameNode;

// ─────────────────────────────────────────────────────────────────────────────
// Keyword alias normalization
// ─────────────────────────────────────────────────────────────────────────────

const KEYWORD_ALIASES: Record<string, string> = {
    // Name
    n: 'name',
    // Oracle text
    o: 'oracle',
    oracle: 'oracle',
    text: 'oracle',
    fulloracle: 'oracle',
    fo: 'oracle',
    // Type line
    t: 'type',
    type: 'type',
    // Keywords (ability words)
    kw: 'keyword',
    keyword: 'keyword',
    // Tags
    tag: 'tag',
    otag: 'tag',
    // Color
    c: 'color',
    color: 'color',
    // Color identity
    id: 'coloridentity',
    identity: 'coloridentity',
    coloridentity: 'coloridentity',
    // Mana value
    cmc: 'cmc',
    mv: 'cmc',
    manavalue: 'cmc',
    // Rarity
    r: 'rarity',
    rarity: 'rarity',
    // Word count (excluding reminder text)
    wc: 'wordcount',
    words: 'wordcount',
    wordcount: 'wordcount',
    // Word count (including reminder text)
    wcr: 'wordcountreminder',
    wordsrem: 'wordcountreminder',
    wordcountreminder: 'wordcountreminder',
    // Year / release
    year: 'year',
    released: 'year',
    // Date (full ISO date or year)
    date: 'date',
    // Prices
    usd: 'usd',
    tix: 'tix',
    // CubeCobra stats
    elo: 'elo',
    pop: 'popularity',
    popularity: 'popularity',
    // Cube membership counts
    cubecount: 'cubecount',
    cubes: 'cubecount',
    cc: 'cubecount',
    count: 'count',
    // Set
    s: 'set',
    e: 'set',
    set: 'set',
    edition: 'set',
    // Set type
    st: 'settype',
    settype: 'settype',
    // Layout
    layout: 'layout',
    // Format legality
    f: 'legal',
    format: 'legal',
    legal: 'legal',
    // Game availability
    game: 'game',
    // Cube membership
    cube: 'cube',
    in: 'cube',
    // Cube highlight (visual-only; rows are never filtered out)
    highlight: 'highlight',
    // Cube size (card count)
    size: 'cubesize',
    cubesize: 'cubesize',
    // Cube category (assumed categories like peasant, pauper, powered)
    category: 'cubecategory',
    cat: 'cubecategory',
    cubecategory: 'cubecategory',
    // Cube playability (mtgo, arena, paper)
    playable: 'playable',
    play: 'playable',
    // Global inclusion rate (CubeCobra frequency data)
    global: 'globalrate',
    globalrate: 'globalrate',
    gr: 'globalrate',
    // Boolean flags
    is: 'is',
    not: 'not',
    // Power
    pow: 'power',
    power: 'power',
    // Toughness
    tou: 'toughness',
    toughness: 'toughness',
    // Total power + toughness
    pt: 'pt',
    powtou: 'pt',
    // Loyalty
    loy: 'loyalty',
    loyalty: 'loyalty',
    // Mana cost
    m: 'mana',
    mana: 'mana',
    cost: 'mana',
    // Produced mana
    produces: 'produces',
    // Collector number
    cn: 'number',
    number: 'number',
    // Sort order
    order: 'order',
    sort: 'order',
    // Sort direction
    dir: 'direction',
    direction: 'direction',
};

export function normalizeKeyword(raw: string): string {
    return KEYWORD_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse result
// ─────────────────────────────────────────────────────────────────────────────

export interface ParseResult {
    ast: QueryNode | null;
    error: string | null;
}

function normalizeNode(node: QueryNode): QueryNode {
    if (!node) return node;
    if (node.type === 'and' || node.type === 'or') {
        return { ...node, left: normalizeNode(node.left), right: normalizeNode(node.right) };
    }
    if (node.type === 'not') {
        return { ...node, child: normalizeNode(node.child) };
    }
    if (node.type === 'condition') {
        return { ...node, keyword: normalizeKeyword(node.keyword) };
    }
    return node;
}

export function parseQuery(input: string): ParseResult {
    const trimmed = input.trim();
    if (!trimmed) {
        return { ast: null, error: null };
    }

    try {
        const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
        parser.feed(trimmed);
        const results = parser.results;

        if (!results || results.length === 0) {
            return { ast: null, error: 'Incomplete query — check for missing values after operators.' };
        }

        // Nearley can return multiple parse trees for ambiguous grammars; take the first.
        const ast = normalizeNode(results[0] as QueryNode);
        return { ast, error: null };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // Trim nearley's verbose token dumps to a short user-facing message
        const shortMsg = msg.split('\n')[0].replace(/^Error: /, '');
        return { ast: null, error: `Parse error: ${shortMsg}` };
    }
}
