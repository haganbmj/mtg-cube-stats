# Cube Search Filter

Add a search/filter input to the OverviewTab cube table, using the same Nearley-based parser infrastructure as the card search. The cube filter evaluates queries against cube metadata, statistics, and card containment.

## Architecture

Reuse the existing grammar (`cardFilters.grammar.ts`) and parser (`CardFilterParser.ts`) unchanged. Create a new `CubeFilterEvaluator.ts` that interprets the AST against cube rows. The evaluator receives a cube row (from `overviewTableData`) enriched with its `cards` array from `loadedCubes`, and returns `true`/`false`.

## Keyword Reference

### Name (bare word / `name:`)

Bare words and `name:` match against `cube.name` (substring, case-insensitive). Quoted strings supported: `"vintage cube"`.

### Metadata

| Keyword(s) | Field | Type | Example |
|---|---|---|---|
| `owner` | `cube.owner` | string substring | `owner:wtwlf` |
| `id` | `cube.id` or `cube.shortId` | string exact | `id:1001` |
| `category`, `cat` | `cube.stats.assumedCategories` | array contains (substring) | `category:peasant` |
| `modified`, `date` | `cube.lastModified` | date comparison | `modified>=2025-01-01` |
| `followers` | `cube.followerCount` | numeric | `followers>=100` |

### Size & Absolute Numeric Stats

These compare against raw numeric values.

| Keyword(s) | Field | Example |
|---|---|---|
| `size`, `cards`, `totalcards` | `stats.totalCards` | `size>=360` |
| `avgcmc`, `cmc` | `stats.averageNonLandCmc` | `avgcmc<=3.2` |
| `price`, `usd` | `stats.totalMinPriceUsd` | `price<=500` |
| `tix` | `stats.totalMinPriceTix` | `tix>=100` |
| `similarity`, `sim` | `cube.avgSimilarityScore` | `sim>=0.5` |
| `elo` | `stats.averageElo` | `elo>=1400` |
| `keywords`, `kw` | `stats.uniqueNonEvergreenKeywords` | `keywords>=30` |

### Percentage-Based Keywords

Values are expressed as a percentage of `stats.totalCards`. The evaluator computes `(count / totalCards) * 100` and compares against the query value.

| Keyword(s) | Field (count) | Example |
|---|---|---|
| `creatures` | `stats.creatureCards` | `creatures>=40` |
| `lands` | `stats.landCards` | `lands<=45` |
| `new` | `stats.newCards` | `new>=5` |
| `removal` | `stats.cardCounts.removal` | `removal>=10` |
| `tokens` | `stats.cardCounts.makesTokens` | `tokens>=15` |
| `ub` | `stats.cardCounts.universesBeyond` | `ub=0` |
| `sp` | `stats.cardCounts.supplementalProduct` | `sp<=5` |

### Color Distribution (Percentage-Based)

Values compared against `(stats.colorDistribution[color] / stats.totalCards) * 100`.

| Keyword(s) | Example |
|---|---|
| `white`, `w` | `white>=15` |
| `blue`, `u` | `blue>=20` |
| `black`, `b` | `black<=10` |
| `red`, `r` | `red>=15` |
| `green`, `g` | `green>=15` |
| `colorless`, `c` | `colorless>=5` |
| `multicolor`, `multi`, `m` | `multi>=20` |

### Playability (`game:` / `in:`)

| Keyword(s) | Field | Example |
|---|---|---|
| `game`, `in` | platform playability | `game:arena`, `in:mtgo` |

Values: `arena` → `stats.arenaPlayable`, `mtgo` → `stats.mtgoPlayable`, `paper` → `stats.paperPlayable`. With `:` operator, checks boolean is `true`. Negation via `-game:arena`.

### Card Containment (`card:`)

Queries whether the cube contains a card by name.

- `card:bolt` → substring match against card names in the cube (case-insensitive)
- `card="lightning bolt"` → exact name match (case-insensitive)
- `-card:counterspell` → cube does NOT contain a card matching "counterspell"

The evaluator receives the cube's `cards` array (from `loadedCubes[cube.id].cards`) and checks card names.

### Boolean Logic

Same as card filter: implicit AND between terms, explicit `OR`, `-` for negation, parentheses for grouping.

```
category:peasant creatures>=40 -card:counterspell
(owner:wtwlf OR owner:bmc) size>=360
```

## UI Design

### Toggle Button

A search icon button added to the OverviewTab toolbar actions (alongside Grid/List toggle and the Menu button). When the search row is visible, the button shows as `type="primary"`.

### Search Row

Appears between the toolbar and the table/grid content when toggled on. Contains:
- `el-input` with placeholder: `Search cubes... (e.g. size>=360 creatures>=40, or click ? for help)`
- Clear button (built-in `clearable`)
- `?` suffix button that opens the `CubeFilterHelp` dialog
- Parse error message below input (red text, same pattern as card search)
- Result count text: `"12 / 45 Cubes"` when a query is active

### Behavior

- Query debounced at 250ms before parsing/filtering
- Filter applies to `sortedData` in OverviewTab — both table and visual grid respect it
- Empty query = no filtering (all cubes shown)
- Search row visibility persisted to localStorage via `bindStorage`
- Query text is NOT persisted (transient)

### Help Dialog (`CubeFilterHelp`)

A modal documenting the available keywords, operators, and examples. Same structure as `CardFilterHelp.vue` (table of keywords + description + examples, operator reference, boolean logic explanation).

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/util/CubeFilterEvaluator.ts` | Keyword aliases, AST evaluation against cube rows, percentage normalization |
| Create | `src/components/filters/CubeSearchInput.vue` | Input + help toggle + parse error display |
| Create | `src/components/filters/CubeFilterHelp.vue` | Help dialog documenting cube filter syntax |
| Modify | `src/tabs/OverviewTab.vue` | Toggle button, conditional search row, filter integration into sortedData |

No changes to the grammar or parser — reused as-is.

## Evaluator Details

### Keyword Alias Map

```typescript
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
    // Date
    modified: 'modified',
    date: 'modified',
    // Followers
    followers: 'followers',
    // Size
    size: 'size',
    cards: 'size',
    totalcards: 'size',
    // CMC
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
    // Keywords
    keywords: 'keywords',
    kw: 'keywords',
    // Percentage-based
    creatures: 'creatures',
    lands: 'lands',
    new: 'new',
    removal: 'removal',
    tokens: 'tokens',
    ub: 'ub',
    sp: 'sp',
    // Colors
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
```

### Context Interface

```typescript
export interface CubeFilterContext {
    /** Cards for this cube (from loadedCubes[id].cards) */
    cards: Array<{ name: string; [key: string]: any }>;
}
```

The evaluator function signature:

```typescript
export function evaluateCubeFilter(
    ast: QueryNode,
    cube: any, // overviewTableData row
    context: CubeFilterContext,
): boolean;
```

### Percentage Normalization

For percentage keywords, the evaluator computes:
```typescript
const totalCards = cube.stats?.totalCards || 1;
const actual = (rawCount / totalCards) * 100;
// Then: compareValues(actual, op, queryValue)
```

### Color Distribution

The `colorDistribution` field uses keys `W`, `U`, `B`, `R`, `G`, `C` — computed from non-land cards. Each value is a count of non-land cards with that color. Note: a multicolor card (e.g., W+U) is counted in both `W` and `U`.

There is no pre-computed "multicolor" stat. The evaluator derives it at filter time by counting non-land cards with `colors.length >= 2` from the cube's cards array.

The evaluator maps keyword → distribution key and computes the percentage against non-land count (to match how the distribution is computed).
