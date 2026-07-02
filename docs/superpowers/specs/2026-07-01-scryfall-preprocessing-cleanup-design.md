# Scryfall Preprocessing Cleanup

## Context

The Scryfall preprocessing pipeline (`download-scryfall-cards.ts`) produces `data/cards-minimized.json`, the largest bundled JSON in the app. A review of the pipeline against actual consumer usage in `src/` surfaced two classes of issues:

1. **Extraneous fields** emitted to the output but never read anywhere (only appear in type declarations). These inflate bundle size for no benefit.
2. **Consistency and correctness issues** in per-card field handling — including at least one likely latent bug in split-card mana-cost handling.

The preprocessing code even carries a `FIXME` at the top of the reduce block flagging "trim this model even more", confirming this cleanup is overdue.

This spec defines five independent tasks that address the review findings. Each task is small, low-risk, and independently mergeable.

## Goals

- Reduce `cards-minimized.json` size by removing dead fields
- Fix a latent split-card `manaCost` bug that could silently break `cost:` filter queries
- Normalize a shape inconsistency in `producedMana` across pipeline stages
- Clean up two trivial code-quality issues (dead regex alternative, missing comment)

## Non-Goals

- No changes to the JSONL download / streaming pipeline itself
- No changes to consumer code beyond what's mechanically required by field removals
- No removal of `isSupplementalProduct` (see "Deliberately Deferred" below)
- No refactoring of the reduce/best-printing selection logic

## Tasks

### Task 1 — Trim extraneous fields from output

**Fields to drop from `cards-minimized.json` and `ScryfallCard`:**

| Field | Why safe to drop |
|-------|------------------|
| `priceUsd`, `priceTix` | Never read by any consumer. `CubeFunctions.remapCube()` only reads `minPriceUsd` / `minPriceTix` |
| `promoTypes` | Used only inside the reduce to derive `isUniversesBeyond`; no consumer reads the array |
| `rarities` | Used only inside the reduce to derive `minRarity`; no consumer reads the array (the `.row-rarities` CSS class in `CardSummaryTable.vue` is unrelated) |
| `isToken` | Token layouts (`token`, `double_faced_token`) are excluded upstream via `excludedLayouts`, so no output card can have `isToken: true`. The "best" reduce's `!p.isToken` guard is dead |

**Approach:**

- Keep the internal computations that use these fields as inputs (min-price aggregation, `isUniversesBeyond` derivation, `minRarity` derivation, oldest-non-token printing selection). Simply don't emit the raw fields into the final object.
- Remove the corresponding properties from `src/types/scryfall.ts`.
- Confirm no consumer regression via `tsc` and a full production build.

**Verification:**

- `npm run cards` completes without error
- `npm run build` completes without TypeScript errors
- `data/cards-minimized.json` size is smaller than before the change
- Filter DSL still works for price (`usd:`, `tix:`), UB (`ub:`), and rarity (`r:`, `minr:`) queries

---

### Task 2 — Fix split-card `manaCost` handling

**Current behavior** ([download-scryfall-cards.ts#L289-L291](../../../download-scryfall-cards.ts#L289)):

```ts
manaCost: (card.card_faces && card.layout !== 'split')
    ? (card.card_faces[0].mana_cost ?? card.mana_cost ?? '')
    : (card.mana_cost ?? ''),
```

For split cards this falls through to top-level `card.mana_cost`, which Scryfall returns as a joined string like `{2}{U} // {3}{B}`. The filter DSL's `cost:` predicate in `CardFilterEvaluator.ts` reads `row.manaCost` directly, and does not appear to special-case `//`, so cost predicates may silently misbehave on split cards.

**Approach:**

1. Verify actual behavior: inspect the current `manaCost` value for a known split card (e.g., Fire // Ice) in `cards-minimized.json`, then trace how `CardFilterEvaluator` handles that value for representative cost queries.
2. If broken, prefer concatenating face mana costs (`{2}{U}{3}{B}`) in preprocessing — this matches how `colors` is already aggregated for split cards (union of both faces). Update the split branch to compute `card_faces.map(f => f.mana_cost).join('')`.
3. Add a regression test in `src/util/CardFilter.test.ts` with a split-card fixture, exercising a `cost:` predicate.

**Verification:**

- New regression test passes
- Existing filter tests still pass
- `npm run cards && npm run build` both succeed

---

### Task 3 — Normalize `producedMana` pipeline shape

**Current state** — three sites, three shapes:

| Site | Shape when empty |
|------|------------------|
| `stripped` (map pass) | `undefined` (raw passthrough) |
| Reduce output | `undefined` (already explicit) |
| `CubeFunctions.remapCube` | `[]` (defaulted) |

Consumers work only because `CardFilterEvaluator` uses `(row.producedMana ?? []).map(...)` defensively.

**Approach:**

- Choose `undefined`-when-empty as the canonical shape (matches optional-boolean-style fields elsewhere, keeps JSON smaller).
- Apply consistently in all three sites. The remap layer should emit `undefined`, not `[]`, when the field is missing.
- No consumer change required — they already handle undefined.

**Verification:**

- `produces:` filter queries still evaluate correctly (existing test coverage)
- Spot-check: cards known to produce mana (e.g., Sol Ring, Birds of Paradise) still return a non-empty array in the output

---

### Task 4 — Simplify `isPhyrexian` regex

**Current** ([download-scryfall-cards.ts#L287-L289](../../../download-scryfall-cards.ts#L287)):

```ts
isPhyrexian: /\{[WUBRGC2]*\/P\}|\{P\/[WUBRG]\}/.test(...)
```

The second alternative `\{P\/[WUBRG]\}` is dead — Scryfall always encodes Phyrexian mana as `{W/P}`, never `{P/W}`.

**Approach:** Replace with `/\{[WUBRGC2]*\/P\}/`.

**Verification:** Diff the set of oracle IDs with `isPhyrexian: true` in the output before and after the change. Should be identical.

---

### Task 5 — Comment `legality.vintage` restricted handling

The vintage legality derivation includes `=== 'legal' || === 'restricted'`, unlike the other formats which only accept `'legal'`. This is intentional (restricted cards are legal in Vintage with a 1-of limit) but non-obvious to future readers.

**Approach:** Add a one-line comment next to the vintage branch explaining the difference.

**Verification:** N/A — comment-only change.

---

## Deliberately Deferred

**`isSupplementalProduct`** — technically derivable from `setType` (true when `setType` is not `core` or `expansion`). Removing it means every consumer duplicates the set-membership check, and the field only occupies bytes when true (missing-key style encoding). Bundle savings are near-zero; consumer complexity increases. Recommend leaving as-is unless a broader bundle audit revisits it.

## Test Strategy

- Tasks 1, 3, 4: rely on existing test suite + `tsc` + `npm run build` to catch regressions
- Task 2: adds a targeted regression test for split-card cost handling
- Task 5: no test needed (comment-only)

## Rollout

All tasks are independently mergeable and can proceed in any order. Suggested order (roughly increasing risk):

1. Task 5 (comment-only)
2. Task 4 (regex simplification)
3. Task 1 (field removals — pure size win)
4. Task 3 (shape normalization)
5. Task 2 (split-card fix — highest risk due to actual behavior change and test authoring)

Each task lands in its own commit for easy revert if regressions surface.
