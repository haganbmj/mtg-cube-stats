# Scryfall Preprocessing Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim dead fields from `cards-minimized.json`, normalize one shape inconsistency, and add a small handful of low-risk polish fixes to `download-scryfall-cards.ts`.

**Architecture:** Five independent, small-diff tasks against the Scryfall preprocessing pipeline. No new files. Each task lands as a standalone commit.

**Tech Stack:** TypeScript (tsx runtime), Vitest, Vite. The pipeline runs at build time via `npm run cards`.

## Global Constraints

- The pipeline outputs to `data/cards-minimized.json`. `data/` is `.gitignore`d — never commit generated JSON.
- `npm run cards` requires the `data/default-cards.jsonl` file to exist. If it's missing, the script will download it via `npm run cards:update`. Prefer `npm run cards` to avoid re-downloading ~100MB.
- All type definitions for the output live in `src/types/scryfall.ts`. Any field removed from the JSON must also be removed from the type.
- The consumer glue is `src/util/CubeFunctions.ts::enrichCube()` (the function name is not literally `enrichCube` — the relevant code starts around line 200 with `scryfallCard?.<field>` reads). If a field is removed from the type, that file must not reference it.
- Do not run `npm run preload` — no cube data changes are needed.
- Tests run via `npm test` (Vitest, non-watch mode) or `npx vitest run` for a single file.

## Reference: Source of Truth for Each Task's Line Targets

- `download-scryfall-cards.ts` — the entire pipeline (~500 lines). The two hot regions are:
  - **Stripped map pass** (~line 265-303): per-card intermediate shape
  - **Reduce pass** (~line 333-410): builds `store.cards[oracleId]` array
  - **Best-printing reduce** (~line 412-445): collapses to one printing per oracle id
- `src/types/scryfall.ts` — `ScryfallCard` interface

Line numbers are approximate; verify with `grep_search` before each edit.

---

### Task 1: Comment `legality.vintage` restricted handling

**Files:**
- Modify: `download-scryfall-cards.ts` (line near `card.legalities?.vintage`)

**Interfaces:**
- Consumes: nothing
- Produces: nothing (comment-only)

- [ ] **Step 1: Locate the vintage legality line**

Run: `grep -n "vintage" download-scryfall-cards.ts`
Expected: one hit inside the `legality: { ... }` object literal in the reduce pass, currently:
```ts
vintage: (card.legalities?.vintage === 'legal' || card.legalities?.vintage === 'restricted') ? true : undefined,
```

- [ ] **Step 2: Add the comment**

Replace:
```ts
            legality: {
                standard: card.legalities?.standard === 'legal' ? true : undefined,
                pioneer: card.legalities?.pioneer === 'legal' ? true : undefined,
                modern: card.legalities?.modern === 'legal' ? true : undefined,
                legacy: card.legalities?.legacy === 'legal' ? true : undefined,
                vintage: (card.legalities?.vintage === 'legal' || card.legalities?.vintage === 'restricted') ? true : undefined,
            },
```

With:
```ts
            legality: {
                standard: card.legalities?.standard === 'legal' ? true : undefined,
                pioneer: card.legalities?.pioneer === 'legal' ? true : undefined,
                modern: card.legalities?.modern === 'legal' ? true : undefined,
                legacy: card.legalities?.legacy === 'legal' ? true : undefined,
                // Restricted cards are legal in Vintage (limited to 1 copy) so count them as legal.
                vintage: (card.legalities?.vintage === 'legal' || card.legalities?.vintage === 'restricted') ? true : undefined,
            },
```

- [ ] **Step 3: Commit**

```bash
git add download-scryfall-cards.ts
git commit -m "docs(scryfall): explain vintage restricted legality handling"
```

---

### Task 2: Simplify `isPhyrexian` regex

**Files:**
- Modify: `download-scryfall-cards.ts` (line near `isPhyrexian:`)

**Interfaces:**
- Consumes: nothing
- Produces: same output as before (dead alternative removed)

- [ ] **Step 1: Snapshot current output for comparison**

Run:
```bash
node -e "const d = require('./data/cards-minimized.json'); const ids = Object.entries(d.cards).filter(([, c]) => c.isPhyrexian).map(([id]) => id).sort(); require('fs').writeFileSync('/tmp/phyrexian-before.txt', ids.join('\n'));"
```
Expected: silent success. `/tmp/phyrexian-before.txt` contains one oracle id per line.

If `data/cards-minimized.json` doesn't exist yet, run `npm run cards` first.

- [ ] **Step 2: Locate the regex**

Run: `grep -n "isPhyrexian:" download-scryfall-cards.ts`
Expected: one hit in the stripped map pass:
```ts
        isPhyrexian: /\{[WUBRGC2]*\/P\}|\{P\/[WUBRG]\}/.test(
            card.mana_cost || (card.card_faces ?? []).map((f: any) => f.mana_cost || '').join(''),
        ),
```

- [ ] **Step 3: Remove the dead alternative**

Replace:
```ts
        isPhyrexian: /\{[WUBRGC2]*\/P\}|\{P\/[WUBRG]\}/.test(
            card.mana_cost || (card.card_faces ?? []).map((f: any) => f.mana_cost || '').join(''),
        ),
```

With:
```ts
        isPhyrexian: /\{[WUBRGC2]*\/P\}/.test(
            card.mana_cost || (card.card_faces ?? []).map((f: any) => f.mana_cost || '').join(''),
        ),
```

- [ ] **Step 4: Regenerate and diff**

Run: `npm run cards`
Expected: completes with exit code 0, no errors.

Then:
```bash
node -e "const d = require('./data/cards-minimized.json'); const ids = Object.entries(d.cards).filter(([, c]) => c.isPhyrexian).map(([id]) => id).sort(); require('fs').writeFileSync('/tmp/phyrexian-after.txt', ids.join('\n'));"
diff /tmp/phyrexian-before.txt /tmp/phyrexian-after.txt
```
Expected: empty diff (no cards gained or lost the `isPhyrexian` flag).

- [ ] **Step 5: Commit**

```bash
git add download-scryfall-cards.ts
git commit -m "refactor(scryfall): drop dead alternative from isPhyrexian regex"
```

---

### Task 3: Add regression test for split-card `mana:` filter

**Files:**
- Modify: `src/util/CardFilter.test.ts` (append a new `describe` block or add tests to an existing one)

**Interfaces:**
- Consumes: `makeCard()` fixture factory (lines 9-42 of the test file), `evaluate()` helper (line ~48), `parseQuery` from `CardFilterParser`, `evaluateCard` from `CardFilterEvaluator`
- Produces: nothing

- [ ] **Step 1: Write the failing tests first**

Open `src/util/CardFilter.test.ts` and append at the end of the file (after the last existing `describe` block):

```ts
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
```

- [ ] **Step 2: Run the new tests to confirm they pass (they should — this locks in current behavior)**

Run: `npx vitest run src/util/CardFilter.test.ts`
Expected: all tests pass, including the 4 new ones. If any fail, the underlying behavior differs from what the spec documented — stop and investigate before continuing.

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/util/CardFilter.test.ts
git commit -m "test(filter): lock in split-card mana: filter behavior"
```

---

### Task 4: Trim extraneous fields from output

Drop `priceUsd`, `priceTix`, `promoTypes`, `rarities`, and `isToken` from `cards-minimized.json`. Keep the underlying computations that use them as inputs (min-price aggregation, `isUniversesBeyond` derivation, `minRarity` derivation, oldest-non-token best-printing selection). Just don't emit the raw fields.

**Files:**
- Modify: `download-scryfall-cards.ts` (stripped map pass, reduce pass, best-printing reduce)
- Modify: `src/types/scryfall.ts` (remove fields from `ScryfallCard`)

**Interfaces:**
- Consumes: nothing new
- Produces: `ScryfallCard` interface with 5 fewer properties

- [ ] **Step 1: Snapshot current output size and a sample card**

Run:
```bash
ls -la data/cards-minimized.json
node -e "const d = require('./data/cards-minimized.json'); const first = Object.values(d.cards)[0]; console.log(JSON.stringify(first, null, 2));" | head -40
```
Expected: file size printed; a sample card's shape shown. Remember the file size for comparison later.

- [ ] **Step 2: Remove `promoTypes` from the reduce output**

`promoTypes` is written to every printing but only used *internally* to derive `isUniversesBeyond`. The derivation happens on the same line, so we can drop the field itself without touching the derivation.

Locate the reduce block that pushes into `store.cards[key]`. Find these adjacent lines:
```ts
            fromBooster: card.fromBooster,
            promoTypes: card.promoTypes,
            layout: card.layout,
```

Replace with:
```ts
            fromBooster: card.fromBooster,
            layout: card.layout,
```

Verify the `isUniversesBeyond` derivation later in the same block is unchanged:
```ts
            isUniversesBeyond: card.promoTypes.includes('universesbeyond') ? true : undefined,
```
This reads from `card.promoTypes` on the *stripped* intermediate, not from the reduce output — safe.

- [ ] **Step 3: Remove `isToken` from the reduce output**

`isToken` is always undefined on any card that reaches the output because the `token` and `double_faced_token` layouts are excluded upstream via `excludedLayouts`. It's also referenced by the best-printing filter but that filter is redundant with the layout exclusion.

Locate in the reduce block:
```ts
            isDigital: card.isDigital ? true : undefined,
            isPromo: card.isPromo ? true : undefined,
            isToken: card.isToken ? true : undefined,
            isHybrid: card.isHybrid ? true : undefined,
```

Replace with:
```ts
            isDigital: card.isDigital ? true : undefined,
            isPromo: card.isPromo ? true : undefined,
            isHybrid: card.isHybrid ? true : undefined,
```

Locate the best-printing filter later in the file:
```ts
    store[key] = card.filter((printing: any) => {
        return !printing.isDigital && !printing.isPromo && !printing.isToken;
    })?.[0] ?? card[0];
```

Replace with:
```ts
    store[key] = card.filter((printing: any) => {
        return !printing.isDigital && !printing.isPromo;
    })?.[0] ?? card[0];
```

- [ ] **Step 4: Remove `priceUsd` and `priceTix` from the reduce output**

They are only used as input to `Math.min(...)` in the best-printing reduce. The `Math.min` call reads from each printing's `.priceUsd` / `.priceTix`, so we cannot simply drop them from `store.cards[key]`. Instead, we need the values available on printings during the best-reduce but *not* on the final output.

Approach: move the min computation into the reduce pass (compute per-oracle-id min while iterating), storing intermediate mins on a separate collector, then drop the per-printing prices from the pushed shape.

Locate the reduce block. Above the `store.cards[key] = store.cards[key] || [];` line, add a per-oracle-id price collector. Change:

```ts
        const tokenOracleIds = [...new Set(
            card.allParts
                .filter((part: any) => part.component === 'token')
                .map((part: any) => idToOracleId[part.id])
                .filter(Boolean),
        )] as string[];
        store.cards[key] = store.cards[key] || [];
        store.cards[key].push({
```

To:

```ts
        const tokenOracleIds = [...new Set(
            card.allParts
                .filter((part: any) => part.component === 'token')
                .map((part: any) => idToOracleId[part.id])
                .filter(Boolean),
        )] as string[];

        // Track minimum prices per oracle id as we go, so we don't have to store
        // per-printing prices on every card just to compute the min later.
        store.minPrices[key] = store.minPrices[key] || { usd: Number.MAX_SAFE_INTEGER, tix: Number.MAX_SAFE_INTEGER };
        if (card.priceUsd != null) {
            store.minPrices[key].usd = Math.min(store.minPrices[key].usd, card.priceUsd);
        }
        if (card.priceTix != null) {
            store.minPrices[key].tix = Math.min(store.minPrices[key].tix, card.priceTix);
        }

        store.cards[key] = store.cards[key] || [];
        store.cards[key].push({
```

Then find the end of the pushed object literal:
```ts
            urlFront: card.imageUris.front,
            urlBack: card.imageUris.back,
            priceUsd: card.priceUsd,
            priceTix: card.priceTix,
        });
```

Replace with:
```ts
            urlFront: card.imageUris.front,
            urlBack: card.imageUris.back,
        });
```

Update the reduce initial value from:
```ts
}, { cards: {}, sets: {} });
```

To:
```ts
}, { cards: {}, sets: {}, minPrices: {} });
```

- [ ] **Step 5: Update the best-printing reduce to read from `minimized.minPrices`, then drop the intermediate**

Locate:
```ts
    // FIXME: Should this store off which printing is the cheapest?
    const minPriceUsd = Math.min(...card.map((c: any) => c.priceUsd ?? Number.MAX_SAFE_INTEGER));
    if (minPriceUsd != Number.MAX_SAFE_INTEGER) {
        store[key].minPriceUsd = minPriceUsd;
    }

    const minPriceTix = Math.min(...card.map((c: any) => c.priceTix ?? Number.MAX_SAFE_INTEGER));
    if (minPriceTix != Number.MAX_SAFE_INTEGER) {
        store[key].minPriceTix = minPriceTix;
    }
```

Replace with:
```ts
    const collectedPrices = minimized.minPrices[key];
    if (collectedPrices.usd !== Number.MAX_SAFE_INTEGER) {
        store[key].minPriceUsd = collectedPrices.usd;
    }
    if (collectedPrices.tix !== Number.MAX_SAFE_INTEGER) {
        store[key].minPriceTix = collectedPrices.tix;
    }
```

Then delete the intermediate collector before the JSON write. The output writer does `JSON.stringify(minimized, ...)`, so any leftover keys on `minimized` end up in the output.

Locate:
```ts
minimized.cards = best;

minimized.setDates = setDates;
```

Replace with:
```ts
minimized.cards = best;
delete minimized.minPrices;

minimized.setDates = setDates;
```

- [ ] **Step 6: Remove `rarities` from the best-printing reduce output**

`rarities` is only used to derive `minRarity` on the same lines below. The derivation reads `allRarities` directly, so we can drop the `store[key].rarities = allRarities;` assignment without touching the derivation.

Locate:
```ts
    const allRarities = Array.from(new Set(card.map((c: any) => c.rarity)));
    store[key].rarities = allRarities;

    const minRarity = allRarities.sort((a: string, b: string) => {
        return minRarityOrder.indexOf(a) - minRarityOrder.indexOf(b);
    })[0];
    store[key].minRarity = minRarity;
```

Replace with:
```ts
    const allRarities = Array.from(new Set(card.map((c: any) => c.rarity)));
    const minRarity = allRarities.sort((a: string, b: string) => {
        return minRarityOrder.indexOf(a) - minRarityOrder.indexOf(b);
    })[0];
    store[key].minRarity = minRarity;
```

- [ ] **Step 7: Remove fields from the `ScryfallCard` type**

Open `src/types/scryfall.ts`. Locate the `ScryfallCard` interface (starts around line 14).

Remove these five property lines:
- `promoTypes: string[];`
- `priceUsd?: number;`
- `priceTix?: number;`
- `rarities: string[];`
- `isToken?: boolean;`

- [ ] **Step 8: Regenerate the JSON and verify shape**

Run: `npm run cards`
Expected: completes with exit code 0. No errors.

Verify the sample card no longer has the removed fields:
```bash
node -e "const d = require('./data/cards-minimized.json'); const first = Object.values(d.cards)[0]; const keys = Object.keys(first).sort(); console.log(keys.join('\n'));"
```
Expected: output does NOT include `promoTypes`, `priceUsd`, `priceTix`, `rarities`, or `isToken`.

Verify no stray top-level keys leaked from intermediate collectors:
```bash
node -e "const d = require('./data/cards-minimized.json'); console.log(Object.keys(d).sort().join('\n'));"
```
Expected: exactly these top-level keys: `cards`, `setDates`, `sets`, `tokens`. If `minPrices` appears here, the `delete minimized.minPrices` line was missed.

Verify size reduction:
```bash
ls -la data/cards-minimized.json
```
Expected: file size smaller than the snapshot from Step 1 (typically a few MB smaller).

- [ ] **Step 9: Typecheck and build**

Run: `npx vue-tsc --noEmit`
Expected: no errors. If any file references the removed fields via `.priceUsd`, `.promoTypes`, etc., they will surface here. Fix them (there should be none — the grep audit showed only the type declaration references, which are the ones we just removed).

Run: `npm run build`
Expected: build completes with exit code 0.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add download-scryfall-cards.ts src/types/scryfall.ts
git commit -m "refactor(scryfall): drop unused fields from cards-minimized.json"
```

---

### Task 5: Normalize `producedMana` pipeline shape

Three sites currently disagree on the empty-value representation for `producedMana`:

| Site | Current shape when empty |
|------|---------------------------|
| `download-scryfall-cards.ts` stripped map pass | `undefined` (raw passthrough of `card.produced_mana`) |
| `download-scryfall-cards.ts` reduce output | `undefined` (already explicit) |
| `src/util/CubeFunctions.ts` (remap layer) | `[]` (defaulted via `?? []`) |

Consumers work only because `CardFilterEvaluator` uses `(row.producedMana ?? []).map(...)` defensively. Canonicalize on `undefined`-when-empty to match the rest of the optional-boolean-style fields.

**Files:**
- Modify: `src/util/CubeFunctions.ts` (one line — the `producedMana:` assignment in the remap function)

**Interfaces:**
- Consumes: `scryfallCard?.producedMana` (already optional)
- Produces: `producedMana` on cube cards is now `string[] | undefined`, matching the JSON

The download script is already consistent internally (both stripped and reduce use undefined-when-empty). The only fix needed is the remap layer.

- [ ] **Step 1: Locate the current defaulted line**

Run: `grep -n "producedMana" src/util/CubeFunctions.ts`
Expected: one hit:
```ts
            producedMana: scryfallCard?.producedMana ?? [],
```

- [ ] **Step 2: Remove the empty-array default**

Replace:
```ts
            loyalty: scryfallCard?.loyalty ?? undefined,
            producedMana: scryfallCard?.producedMana ?? [],
            urlFront: scryfallCard?.urlFront ?? '',
```

With:
```ts
            loyalty: scryfallCard?.loyalty ?? undefined,
            producedMana: scryfallCard?.producedMana,
            urlFront: scryfallCard?.urlFront ?? '',
```

- [ ] **Step 3: Update the `CubeCard` type if it declares `producedMana`**

Run: `grep -n "producedMana" src/types/cube.ts`
Expected: either no match (the field is untyped on `CubeCard`) or a match declaring `producedMana: string[]` (not optional).

If a match exists and is non-optional, change it to `producedMana?: string[];` to match the new nullable shape.

If no match exists, no change needed — the field is accessed dynamically via `any` in `CardFilterEvaluator`.

- [ ] **Step 4: Typecheck**

Run: `npx vue-tsc --noEmit`
Expected: no errors. The `CardFilterEvaluator` already reads with `??  []` guard, so this should be safe.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests pass. If any filter test relied on `producedMana` being an empty array on cards without mana production, it will fail — update the test to use undefined instead.

- [ ] **Step 6: Commit**

```bash
git add src/util/CubeFunctions.ts src/types/cube.ts
git commit -m "refactor(remap): keep producedMana undefined when empty for consistency"
```

If `src/types/cube.ts` wasn't modified, just:
```bash
git add src/util/CubeFunctions.ts
git commit -m "refactor(remap): keep producedMana undefined when empty for consistency"
```

---

## Self-Review Notes

- All 5 tasks from the spec are covered (Tasks 1–5 map 1:1 to spec Tasks 5, 4, 2, 1, 3 respectively — reordered for risk).
- Each task ends with a passing verification and a commit.
- No placeholders, no "TBD", no cross-task type mismatches (Task 4's `store.minPrices` new shape is self-contained; Task 5's optional `producedMana` matches consumer expectations).
- The `isSupplementalProduct` field is deliberately left as-is per the spec's "Deliberately Deferred" note.
