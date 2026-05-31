import type { QueryNode } from './CardFilterParser';

// ─────────────────────────────────────────────────────────────────────────────
// Context passed to the evaluator (gives cube name lookup for `cube:` keyword)
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterContext {
    loadedCubes: Record<string, any>;
    setDates?: Record<string, string>; // setCode (lowercase) -> ISO release date
    resolvedCubeKeys?: Map<string, Set<string>>; // pre-resolved cube: target → matching cube keys
}

// ─────────────────────────────────────────────────────────────────────────────
// Sort directive extraction from AST (order: / direction: keywords)
// ─────────────────────────────────────────────────────────────────────────────

export interface SortDirective {
    prop: string;
    order: 'ascending' | 'descending';
    hasOrder: boolean;
    hasDirection: boolean;
}

const ORDER_ALIASES: Record<string, { prop: string; defaultOrder: 'ascending' | 'descending' }> = {
    name: { prop: 'name', defaultOrder: 'ascending' },
    cmc: { prop: 'cmc', defaultOrder: 'ascending' },
    mv: { prop: 'cmc', defaultOrder: 'ascending' },
    manavalue: { prop: 'cmc', defaultOrder: 'ascending' },
    cubes: { prop: 'cubeCount', defaultOrder: 'descending' },
    cubecount: { prop: 'cubeCount', defaultOrder: 'descending' },
    count: { prop: 'count', defaultOrder: 'descending' },
    color: { prop: 'effectiveColors', defaultOrder: 'ascending' },
    colors: { prop: 'effectiveColors', defaultOrder: 'ascending' },
    type: { prop: 'typeLine', defaultOrder: 'ascending' },
    rarity: { prop: 'minRarity', defaultOrder: 'descending' },
    set: { prop: 'setCode', defaultOrder: 'ascending' },
    settype: { prop: 'setType', defaultOrder: 'ascending' },
    layout: { prop: 'layout', defaultOrder: 'ascending' },
    date: { prop: 'releaseDate', defaultOrder: 'descending' },
    released: { prop: 'releaseDate', defaultOrder: 'descending' },
    price: { prop: 'minPriceUsd', defaultOrder: 'descending' },
    usd: { prop: 'minPriceUsd', defaultOrder: 'descending' },
    tix: { prop: 'minPriceTix', defaultOrder: 'descending' },
    elo: { prop: 'elo', defaultOrder: 'descending' },
    pop: { prop: 'popularity', defaultOrder: 'descending' },
    popularity: { prop: 'popularity', defaultOrder: 'descending' },
    power: { prop: 'power', defaultOrder: 'descending' },
    pow: { prop: 'power', defaultOrder: 'descending' },
    toughness: { prop: 'toughness', defaultOrder: 'descending' },
    tou: { prop: 'toughness', defaultOrder: 'descending' },
    words: { prop: 'oracleTextWordCountMinusParen', defaultOrder: 'descending' },
    wordcount: { prop: 'oracleTextWordCountMinusParen', defaultOrder: 'descending' },
    rate: { prop: 'globalRatePercent_total', defaultOrder: 'descending' },
    globalrate: { prop: 'globalRatePercent_total', defaultOrder: 'descending' },
    gr: { prop: 'globalRatePercent_total', defaultOrder: 'descending' },
    'gr-pauper': { prop: 'globalRatePercent_broad_pauper', defaultOrder: 'descending' },
    'global-rate-pauper': { prop: 'globalRatePercent_broad_pauper', defaultOrder: 'descending' },
    'gr-peasant': { prop: 'globalRatePercent_broad_peasant', defaultOrder: 'descending' },
    'global-rate-peasant': { prop: 'globalRatePercent_broad_peasant', defaultOrder: 'descending' },
    'gr-powered': { prop: 'globalRatePercent_powered', defaultOrder: 'descending' },
    'global-rate-powered': { prop: 'globalRatePercent_powered', defaultOrder: 'descending' },
    'gr-desert': { prop: 'globalRatePercent_desert', defaultOrder: 'descending' },
    'global-rate-desert': { prop: 'globalRatePercent_desert', defaultOrder: 'descending' },
    'gr-uncategorized': { prop: 'globalRatePercent_uncategorized', defaultOrder: 'descending' },
    'global-rate-uncategorized': { prop: 'globalRatePercent_uncategorized', defaultOrder: 'descending' },
};

const DIRECTION_ALIASES: Record<string, 'ascending' | 'descending'> = {
    asc: 'ascending',
    ascending: 'ascending',
    desc: 'descending',
    descending: 'descending',
};

function collectSortNodes(ast: QueryNode | null): { order?: string; direction?: string } {
    if (!ast) return {};
    switch (ast.type) {
        case 'and':
        case 'or': {
            const left = collectSortNodes(ast.left);
            const right = collectSortNodes(ast.right);
            return { ...left, ...right };
        }
        case 'not':
            return collectSortNodes(ast.child);
        case 'condition':
            if (ast.keyword === 'order') return { order: String(ast.value).toLowerCase() };
            if (ast.keyword === 'direction') return { direction: String(ast.value).toLowerCase() };
            return {};
        default:
            return {};
    }
}

/**
 * Extract sort directive from the AST (order: / dir: keywords).
 * Returns null if neither order: nor direction: condition is present.
 */
export function extractSortDirective(ast: QueryNode | null): SortDirective | null {
    const nodes = collectSortNodes(ast);
    if (!nodes.order && !nodes.direction) return null;
    const entry = nodes.order ? ORDER_ALIASES[nodes.order] : null;
    if (nodes.order && !entry) return null;
    const prop = entry?.prop ?? '';
    const defaultOrder = entry?.defaultOrder ?? 'ascending';
    const direction = nodes.direction ? (DIRECTION_ALIASES[nodes.direction] ?? defaultOrder) : defaultOrder;
    return { prop, order: direction, hasOrder: !!nodes.order, hasDirection: !!nodes.direction };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rarity ordering for comparative filters (r>uncommon, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const RARITY_ORDER: Record<string, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    mythic: 3,
};

// Single-letter aliases for rarity values (used when rarity is the value, not the keyword)
const RARITY_VALUE_ALIASES: Record<string, string> = {
    c: 'common',
    u: 'uncommon',
    r: 'rare',
    m: 'mythic',
};

function resolveRarityValue(raw: string): string {
    return RARITY_VALUE_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase();
}

// Expand color name aliases to single-letter codes
const COLOR_NAME_MAP: Record<string, string> = {
    white: 'W', w: 'W',
    blue: 'U',  u: 'U',
    black: 'B', b: 'B',
    red: 'R',   r: 'R',
    green: 'G', g: 'G',
    colorless: 'C', c: 'C',
};

/**
 * Parse a color value like "rg", "blue", "wu", "bant" into an array of
 * single-letter color codes.
 */
function parseColorValue(raw: string): string[] {
    const lower = raw.toLowerCase();

    // Full guild / shard / wedge / college / four-color nicknames
    const GUILD_MAP: Record<string, string[]> = {
        azorius:   ['W', 'U'],
        dimir:     ['U', 'B'],
        rakdos:    ['B', 'R'],
        gruul:     ['R', 'G'],
        selesnya:  ['G', 'W'],
        orzhov:    ['W', 'B'],
        izzet:     ['U', 'R'],
        golgari:   ['B', 'G'],
        boros:     ['R', 'W'],
        simic:     ['G', 'U'],
        bant:      ['G', 'W', 'U'],
        esper:     ['W', 'U', 'B'],
        grixis:    ['U', 'B', 'R'],
        jund:      ['B', 'R', 'G'],
        naya:      ['R', 'G', 'W'],
        abzan:     ['W', 'B', 'G'],
        jeskai:    ['U', 'R', 'W'],
        sultai:    ['B', 'G', 'U'],
        mardu:     ['R', 'W', 'B'],
        temur:     ['G', 'U', 'R'],
        quandrix:  ['G', 'U'],
        prismari:  ['U', 'R'],
        witherbloom: ['B', 'G'],
        lorehold:  ['R', 'W'],
        silverquill: ['W', 'B'],
        chaos:     ['U', 'B', 'R', 'G'],
        aggression: ['B', 'R', 'G', 'W'],
        altruism:  ['R', 'G', 'W', 'U'],
        growth:    ['G', 'W', 'U', 'B'],
        artifice:  ['W', 'U', 'B', 'R'],
        rainbow:   ['W', 'U', 'B', 'R', 'G'],
        fivecolor: ['W', 'U', 'B', 'R', 'G'],
    };

    if (GUILD_MAP[lower]) return GUILD_MAP[lower];

    // Single color name (white, blue, etc.)
    if (COLOR_NAME_MAP[lower]) return [COLOR_NAME_MAP[lower]];

    // Multi-char shorthand: "rg", "wu", etc.
    const result: string[] = [];
    for (const ch of lower) {
        const mapped = COLOR_NAME_MAP[ch];
        if (mapped) result.push(mapped);
    }
    if (result.length > 0) return result;

    // Fallback: uppercase the raw value
    return [raw.toUpperCase()];
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Power / toughness helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a Scryfall power/toughness string to a number.
 * Returns null for non-numeric values like "*", "1+*", "∞".
 */
function parsePT(val: string | undefined | null): number | null {
    if (val == null) return null;
    if (val.includes('*') || val.includes('+') || val.includes('∞')) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

/**
 * Resolve a filter value for power/toughness comparisons.
 * Supports numeric literals and cross-field keywords: pow/power/tou/toughness.
 */
function resolvePTValue(strVal: string, row: any): number | null {
    const lower = strVal.toLowerCase();
    if (lower === 'pow' || lower === 'power') return parsePT(row.power);
    if (lower === 'tou' || lower === 'toughness') return parsePT(row.toughness);
    const n = parseFloat(strVal);
    return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric comparison helper
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

// ─────────────────────────────────────────────────────────────────────────────
// String comparison helper (`:` = substring, `=` = exact)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// is: / not: flag evaluation
// ─────────────────────────────────────────────────────────────────────────────

function evaluateFlag(flag: string, row: any): boolean {
    const f = flag.toLowerCase();
    switch (f) {
        case 'universesbeyond':
        case 'ub':
            return !!row.isUniversesBeyond;
        case 'supplemental':
        case 'sp':
            return !!row.isSupplementalProduct;
        case 'token':
            return !!row.isToken;
        case 'digital':
            return !!row.isDigital;
        case 'promo':
            return !!row.isPromo;
        case 'dfc':
            return ['transform', 'modal_dfc', 'reversible_card'].includes(row.layout);
        // Tag shorthands
        case 'removal':
        case 'draw':
        case 'ramp':
        case 'counterspell':
        case 'flicker':
        case 'tutor':
            return (row.tags ?? []).some((t: string) => t.toLowerCase() === f);
        default:
            return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition evaluator — dispatches per canonical keyword
// ─────────────────────────────────────────────────────────────────────────────

function evaluateCondition(keyword: string, op: string, value: string | number, row: any, ctx: FilterContext): boolean {
    const strVal = String(value);
    const numVal = typeof value === 'number' ? value : parseFloat(strVal);

    switch (keyword) {
        // ── Text fields ──────────────────────────────────────────────────────
        case 'name':
            return compareStrings(row.name, op, strVal);

        case 'oracle':
            return compareStrings(row.oracleText ?? '', op, strVal);

        case 'type':
            return compareStrings(row.typeLine ?? '', op, strVal);

        // ── Array text fields ─────────────────────────────────────────────────
        case 'keyword':
            if (op !== ':' && op !== '=') return false;
            return (row.keywords ?? []).some((k: string) => k.toLowerCase() === strVal.toLowerCase());

        case 'tag':
            if (op !== ':' && op !== '=') return false;
            return (row.tags ?? []).some((t: string) => t.toLowerCase() === strVal.toLowerCase());

        // ── Color ─────────────────────────────────────────────────────────────
        case 'color': {
            const wantedColors = parseColorValue(strVal);
            const rowColors: string[] = (row.effectiveColors ?? []).map((c: string) => c.toUpperCase());

            if (op === '=') {
                // Exact set equality: row must have exactly the wanted colors, no more
                if (wantedColors.length !== rowColors.length) return false;
                return wantedColors.every(wc => rowColors.includes(wc));
            }
            if (op === ':') {
                // Contains all: all wanted colors must be present (supersets allowed)
                return wantedColors.every(wc => rowColors.includes(wc));
            }
            if (op === '!=') {
                return !wantedColors.every(wc => rowColors.includes(wc));
            }
            // Set inclusion operators — strip the 'C' colorless marker so colorless cards
            // are treated as the empty color set {} for subset/superset comparisons.
            const rowColorSet = rowColors.filter(c => c !== 'C');
            const wantedColorSet = wantedColors.filter(c => c !== 'C');
            if (op === '>=') {
                // Superset: row has all wanted colors (and possibly more)
                return wantedColorSet.every(wc => rowColorSet.includes(wc));
            }
            if (op === '>') {
                // Proper superset: row has all wanted colors AND at least one extra
                if (!wantedColorSet.every(wc => rowColorSet.includes(wc))) return false;
                return rowColorSet.some(rc => !wantedColorSet.includes(rc));
            }
            if (op === '<=') {
                // Subset: every color of the row must be in wantedColors (colorless {} matches any)
                return rowColorSet.every(rc => wantedColorSet.includes(rc));
            }
            if (op === '<') {
                // Proper subset: subset AND not equal to wantedColors
                if (!rowColorSet.every(rc => wantedColorSet.includes(rc))) return false;
                return wantedColorSet.some(wc => !rowColorSet.includes(wc));
            }
            return false;
        }

        case 'coloridentity': {
            const wantedColors = parseColorValue(strVal);
            const rowId: string[] = (row.effectiveColorIdentity ?? []).map((c: string) => c.toUpperCase());

            if (op === '=') {
                if (wantedColors.length !== rowId.length) return false;
                return wantedColors.every(wc => rowId.includes(wc));
            }
            if (op === ':') {
                return wantedColors.every(wc => rowId.includes(wc));
            }
            if (op === '!=') {
                return !wantedColors.every(wc => rowId.includes(wc));
            }
            // Set inclusion operators — strip the 'C' colorless marker
            const rowIdSet = rowId.filter(c => c !== 'C');
            const wantedColorSet = wantedColors.filter(c => c !== 'C');
            if (op === '>=') {
                return wantedColorSet.every(wc => rowIdSet.includes(wc));
            }
            if (op === '>') {
                if (!wantedColorSet.every(wc => rowIdSet.includes(wc))) return false;
                return rowIdSet.some(rc => !wantedColorSet.includes(rc));
            }
            if (op === '<=') {
                return rowIdSet.every(rc => wantedColorSet.includes(rc));
            }
            if (op === '<') {
                if (!rowIdSet.every(rc => wantedColorSet.includes(rc))) return false;
                return wantedColorSet.some(wc => !rowIdSet.includes(wc));
            }
            return false;
        }

        // ── Numeric fields ─────────────────────────────────────────────────────
        case 'cmc':
            return compareValues(row.cmc, op, numVal);

        case 'power': {
            const rowPow = parsePT(row.power);
            if (rowPow === null) return false;
            const target = resolvePTValue(strVal, row);
            if (target === null) return false;
            return compareValues(rowPow, op, target);
        }

        case 'toughness': {
            const rowTou = parsePT(row.toughness);
            if (rowTou === null) return false;
            const target = resolvePTValue(strVal, row);
            if (target === null) return false;
            return compareValues(rowTou, op, target);
        }

        case 'pt': {
            const rowPow = parsePT(row.power);
            const rowTou = parsePT(row.toughness);
            if (rowPow === null || rowTou === null) return false;
            const total = rowPow + rowTou;
            const target = resolvePTValue(strVal, row);
            if (target === null) return false;
            return compareValues(total, op, target);
        }

        case 'wordcount':
            return compareValues(row.oracleTextWordCountMinusParen, op, numVal);

        case 'wordcountreminder':
            return compareValues(row.oracleTextWordCount, op, numVal);

        case 'year':
            return compareValues(row.releaseYear, op, numVal);

        // ── Date (full ISO date, bare year, set code, or now/today) ────────────
        case 'date': {
            const releaseDate: string = row.releaseDate ?? '';

            // Resolve the comparison target to a canonical string
            let resolved: string | number = strVal;
            const lower = strVal.toLowerCase();

            if (lower === 'now' || lower === 'today') {
                resolved = new Date().toISOString().slice(0, 10);
            } else if (typeof value === 'string' && ctx.setDates) {
                const setDate = ctx.setDates[lower];
                if (setDate) resolved = setDate;
            }

            const rsv = String(resolved);

            // Year comparison (bare number or 4-digit string)
            if (typeof resolved === 'number' || /^\d{4}$/.test(rsv)) {
                const year = typeof resolved === 'number' ? resolved : parseInt(rsv, 10);
                const releaseYear = row.releaseYear ?? parseInt(releaseDate.slice(0, 4), 10);
                return compareValues(releaseYear, op === ':' ? '=' : op, year);
            }
            // Full ISO date — ISO strings sort lexicographically correctly
            if (op === ':' || op === '=') return releaseDate === rsv;
            if (op === '!=') return releaseDate !== rsv;
            if (op === '<')  return releaseDate < rsv;
            if (op === '<=') return releaseDate <= rsv;
            if (op === '>')  return releaseDate > rsv;
            if (op === '>=') return releaseDate >= rsv;
            return false;
        }

        case 'usd':
            return compareValues(row.minPriceUsd, op, numVal);

        case 'tix':
            return compareValues(row.minPriceTix, op, numVal);

        case 'elo':
            return compareValues(row.elo, op, numVal);

        case 'popularity':
            return compareValues(row.popularity, op, numVal);

        case 'cubecount':
            return compareValues(row.cubeCount, op, numVal);

        case 'count':
            return compareValues(row.count, op, numVal);

        // ── Rarity ─────────────────────────────────────────────────────────────
        case 'rarity': {
            const resolvedRarity = resolveRarityValue(strVal);
            const rowRarityVal = RARITY_ORDER[row.minRarity?.toLowerCase()] ?? -1;
            if (op === ':') {
                // Exact tier name match (supports aliases: c/u/r/m)
                return row.minRarity?.toLowerCase() === resolvedRarity;
            }
            // Comparison against ordered rarity values
            const targetRarityVal = RARITY_ORDER[resolvedRarity] ?? numVal;
            return compareValues(rowRarityVal, op, targetRarityVal);
        }

        // ── Set / SetType / Layout ─────────────────────────────────────────────
        case 'set':
            return compareStrings(row.setCode, op, strVal);

        case 'settype':
            return compareStrings(row.setType, op, strVal);

        case 'layout':
            return compareStrings(row.layout, op, strVal);

        // ── Format legality ────────────────────────────────────────────────────
        case 'legal': {
            const legalities: Record<string, boolean> = row.legality ?? {};
            const isLegal = !!legalities[strVal.toLowerCase()];
            if (op === ':' || op === '=') return isLegal;
            if (op === '!=') return !isLegal;
            return false;
        }

        // ── Games ──────────────────────────────────────────────────────────────
        case 'game': {
            const games: string[] = row.games ?? [];
            const isAvailable = games.some((g: string) => g.toLowerCase() === strVal.toLowerCase());
            if (op === ':' || op === '=') return isAvailable;
            if (op === '!=') return !isAvailable;
            return false;
        }

        // ── Cube membership (by cube name, key, or shortId) ───────────────────
        case 'cube': {
            const rowCubes: string[] = row.cubes ?? [];
            if (rowCubes.length === 0) return false;

            // Use pre-resolved cube keys when available (O(1) per row)
            const resolved = ctx.resolvedCubeKeys?.get(strVal);
            if (resolved) return rowCubes.some(c => resolved.has(c));

            // Fallback: resolve inline (used when ctx.resolvedCubeKeys not provided)
            const matchingKeys = resolveCubeKeysByName(strVal, ctx);
            return rowCubes.some(c => matchingKeys.has(c));
        }

        // ── Cube size (total card count) ───────────────────────────────────────
        case 'cubesize': {
            const rowCubes: string[] = row.cubes ?? [];
            return rowCubes.some((cubeKey: string) => {
                const cube = ctx.loadedCubes[cubeKey] as any;
                const totalCards = cube?.stats?.totalCards ?? cube?.cards?.length;
                return compareValues(totalCards, op, numVal);
            });
        }

        // ── Cube category (assumed categories like peasant, pauper, powered) ───
        case 'cubecategory': {
            const rowCubes: string[] = row.cubes ?? [];
            return rowCubes.some((cubeKey: string) => {
                const cube = ctx.loadedCubes[cubeKey] as any;
                const categories: string[] = cube?.stats?.assumedCategories ?? [];
                if (op === ':') return categories.some((cat: string) => cat.toLowerCase().includes(strVal.toLowerCase()));
                if (op === '=') return categories.some((cat: string) => cat.toLowerCase() === strVal.toLowerCase());
                if (op === '!=') return !categories.some((cat: string) => cat.toLowerCase() === strVal.toLowerCase());
                return false;
            });
        }

        // ── Cube playability (mtgo, arena, paper) ──────────────────────────────
        case 'playable': {
            const rowCubes: string[] = row.cubes ?? [];
            const platform = strVal.toLowerCase();
            const flagKey: Record<string, string> = {
                mtgo: 'mtgoPlayable',
                arena: 'arenaPlayable',
                paper: 'paperPlayable',
            };
            const statKey = flagKey[platform];
            if (!statKey) return false;
            const isPlayable = rowCubes.some((cubeKey: string) => {
                const cube = ctx.loadedCubes[cubeKey] as any;
                return !!cube?.stats?.[statKey];
            });
            if (op === ':' || op === '=') return isPlayable;
            if (op === '!=') return !isPlayable;
            return false;
        }

        // ── Highlight (visual-only; never filters rows) ─────────────────────────
        case 'highlight':
            // highlight: is a visual annotation; it never excludes rows from results
            return true;

        // ── Sort directives (handled externally; never filter rows) ─────────────
        case 'order':
        case 'direction':
            return true;

        // ── Global inclusion rate (CubeCobra frequency data, compared as %) ────
        case 'globalrate':
            return compareValues(row.globalRatePercent_total ?? null, op, numVal);

        // ── Boolean flags ──────────────────────────────────────────────────────
        case 'is': {
            const result = evaluateFlag(strVal, row);
            if (op === ':' || op === '=') return result;
            if (op === '!=') return !result;
            return false;
        }

        case 'not': {
            const result = evaluateFlag(strVal, row);
            if (op === ':' || op === '=') return !result;
            if (op === '!=') return result;
            return false;
        }

        default:
            return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Highlight support — collect oracle IDs for highlight: conditions
// ─────────────────────────────────────────────────────────────────────────────

function resolveCubeKeysByName(value: string, ctx: FilterContext): Set<string> {
    const target = value.toLowerCase();
    const keys = new Set<string>();
    for (const [key, cube] of Object.entries(ctx.loadedCubes)) {
        const nameMatch = (cube as any).name?.toLowerCase().includes(target);
        const keyMatch = key.toLowerCase().includes(target);
        const shortIdMatch = (cube as any).shortId?.toLowerCase().includes(target);
        if (nameMatch || keyMatch || shortIdMatch) keys.add(key);
    }
    return keys;
}

function collectCubeFilterValues(ast: QueryNode | null): string[] {
    if (!ast) return [];
    switch (ast.type) {
        case 'and':
        case 'or':
            return [...collectCubeFilterValues(ast.left), ...collectCubeFilterValues(ast.right)];
        case 'not':
            return collectCubeFilterValues(ast.child);
        case 'condition':
            if (ast.keyword === 'cube') return [String(ast.value)];
            return [];
        default:
            return [];
    }
}

/**
 * Pre-resolve all cube: filter targets in the AST to sets of matching cube keys.
 * Call once before iterating rows, then pass the result via FilterContext.resolvedCubeKeys.
 */
export function preResolveCubeKeys(ast: QueryNode | null, ctx: FilterContext): Map<string, Set<string>> {
    const values = collectCubeFilterValues(ast);
    const map = new Map<string, Set<string>>();
    for (const v of values) {
        if (!map.has(v)) map.set(v, resolveCubeKeysByName(v, ctx));
    }
    return map;
}

function resolveHighlightCubeKeys(value: string, ctx: FilterContext): Set<string> {
    const target = value.toLowerCase();
    const keys = new Set<string>();
    for (const [key, cube] of Object.entries(ctx.loadedCubes)) {
        const nameMatch = (cube as any).name?.toLowerCase().includes(target);
        const keyMatch = key.toLowerCase().includes(target);
        const shortIdMatch = (cube as any).shortId?.toLowerCase().includes(target);
        if (nameMatch || keyMatch || shortIdMatch) keys.add(key);
    }
    return keys;
}

export interface HighlightCubeKeys {
    positive: Set<string>;
    negative: Set<string>;
}

export function collectHighlightCubeKeys(ast: QueryNode | null, ctx: FilterContext, negated = false): HighlightCubeKeys {
    const empty: HighlightCubeKeys = { positive: new Set(), negative: new Set() };
    if (!ast) return empty;
    switch (ast.type) {
        case 'and':
        case 'or': {
            const left = collectHighlightCubeKeys(ast.left, ctx, negated);
            const right = collectHighlightCubeKeys(ast.right, ctx, negated);
            return {
                positive: new Set([...left.positive, ...right.positive]),
                negative: new Set([...left.negative, ...right.negative]),
            };
        }
        case 'not':
            return collectHighlightCubeKeys(ast.child, ctx, !negated);
        case 'condition':
            if (ast.keyword === 'highlight') {
                const keys = resolveHighlightCubeKeys(String(ast.value), ctx);
                return negated
                    ? { positive: new Set(), negative: keys }
                    : { positive: keys, negative: new Set() };
            }
            return empty;
        default:
            return empty;
    }
}

/**
 * Returns the set of oracle IDs whose cube membership matches any highlight:
 * condition in the AST, or null if the query contains no highlight: terms.
 * Supports negation: -highlight:cube highlights cards NOT in the cube.
 */
export function computeHighlightedOracleIds(
    ast: QueryNode | null,
    rows: any[],
    ctx: FilterContext,
): Set<string> | null {
    const { positive, negative } = collectHighlightCubeKeys(ast, ctx);
    if (positive.size === 0 && negative.size === 0) return null;
    const result = new Set<string>();
    for (const row of rows) {
        const rowCubes: string[] = row.cubes ?? [];
        const inPositive = positive.size === 0 || rowCubes.some(c => positive.has(c));
        const notInNegative = negative.size === 0 || !rowCubes.some(c => negative.has(c));
        if (inPositive && notInNegative) result.add(row.oracleId);
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eligible-cube computation — which loaded cubes satisfy cube-level filters
// (cubesize / cubecategory / playable) in the AST.
//
// Returns null when the AST contains no cube-level conditions (no restriction),
// otherwise returns the Set of cube keys that pass those conditions.
// Card-level conditions (cmc, type, …) are treated as unconstrained (null),
// so they never exclude cubes from the eligible set.
// ─────────────────────────────────────────────────────────────────────────────

function hasCubeLevelFilters(ast: QueryNode | null): boolean {
    if (!ast) return false;
    switch (ast.type) {
        case 'and':
        case 'or':
            return hasCubeLevelFilters(ast.left) || hasCubeLevelFilters(ast.right);
        case 'not':
            return hasCubeLevelFilters(ast.child);
        case 'condition':
            return ast.keyword === 'cubesize' || ast.keyword === 'cubecategory' || ast.keyword === 'playable';
        default:
            return false;
    }
}

/**
 * Tri-state eligibility for a single cube:
 *   true  — cube satisfies the cube-level conditions
 *   false — cube fails a cube-level condition
 *   null  — no cube-level conditions apply (unconstrained)
 */
function checkCubeEligibility(ast: QueryNode, cube: any): boolean | null {
    switch (ast.type) {
        case 'and': {
            const l = checkCubeEligibility(ast.left, cube);
            const r = checkCubeEligibility(ast.right, cube);
            if (l === false || r === false) return false;
            if (l === null && r === null) return null;
            if (l === null) return r;
            if (r === null) return l;
            return true;
        }
        case 'or': {
            const l = checkCubeEligibility(ast.left, cube);
            const r = checkCubeEligibility(ast.right, cube);
            // If either branch is unconstrained the cube is always potentially eligible
            if (l === null || r === null) return null;
            return l || r;
        }
        case 'not': {
            const child = checkCubeEligibility(ast.child, cube);
            if (child === null) return null; // negating a card-level filter → no cube restriction
            return !child;
        }
        case 'condition': {
            const { keyword, op, value } = ast;
            const strVal = String(value);
            const numVal = typeof value === 'number' ? value : parseFloat(strVal);
            switch (keyword) {
                case 'cubesize': {
                    const totalCards = cube?.stats?.totalCards ?? cube?.cards?.length;
                    return compareValues(totalCards, op, numVal);
                }
                case 'cubecategory': {
                    const categories: string[] = cube?.stats?.assumedCategories ?? [];
                    if (op === ':') return categories.some(c => c.toLowerCase().includes(strVal.toLowerCase()));
                    if (op === '=') return categories.some(c => c.toLowerCase() === strVal.toLowerCase());
                    if (op === '!=') return !categories.some(c => c.toLowerCase() === strVal.toLowerCase());
                    return null;
                }
                case 'playable': {
                    const flagMap: Record<string, string> = {
                        mtgo: 'mtgoPlayable',
                        arena: 'arenaPlayable',
                        paper: 'paperPlayable',
                    };
                    const statKey = flagMap[strVal.toLowerCase()];
                    if (!statKey) return null;
                    const isPlayable = !!cube?.stats?.[statKey];
                    if (op === ':' || op === '=') return isPlayable;
                    if (op === '!=') return !isPlayable;
                    return null;
                }
                default:
                    return null; // card-level condition — no cube restriction
            }
        }
        default:
            return null;
    }
}

/**
 * Returns the set of cube keys that are eligible based on cube-level filters
 * (size / category / playable) present in the AST.
 * Returns null if the AST contains no cube-level conditions.
 */
export function computeEligibleCubes(
    ast: QueryNode | null,
    loadedCubes: Record<string, any>,
): Set<string> | null {
    if (!ast || !hasCubeLevelFilters(ast)) return null;
    const eligible = new Set<string>();
    for (const [key, cube] of Object.entries(loadedCubes)) {
        // null = unconstrained → include; false = explicitly excluded
        if (checkCubeEligibility(ast, cube) !== false) eligible.add(key);
    }
    return eligible;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main evaluator — walks the AST recursively
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCard(ast: QueryNode | null, row: any, ctx: FilterContext): boolean {
    if (!ast) return true;

    switch (ast.type) {
        case 'and':
            return evaluateCard(ast.left, row, ctx) && evaluateCard(ast.right, row, ctx);

        case 'or':
            return evaluateCard(ast.left, row, ctx) || evaluateCard(ast.right, row, ctx);

        case 'not':
            // highlight: is visual-only — negation should not filter rows either
            if (ast.child.type === 'condition' && ast.child.keyword === 'highlight') return true;
            return !evaluateCard(ast.child, row, ctx);

        case 'name':
            // Bare word — name substring search
            return stripDiacritics((row.name ?? '').toLowerCase()).includes(stripDiacritics(String(ast.value).toLowerCase()));

        case 'condition':
            return evaluateCondition(ast.keyword, ast.op, ast.value, row, ctx);

        default:
            return true;
    }
}
