# MTG Cube Stats Project

A Vue 3 + TypeScript application for analyzing Magic: The Gathering cube statistics with data from Scryfall and CubeCobra.

## Build and Test

**First-time setup**:
```bash
npm install
npm run cards      # Downloads ~100MB Scryfall card data
npm run preload    # Fetches cube data from CubeCobra  
npm run dev        # Start development server
```

**Development commands**:
- `npm run dev` - Vite dev server with hot reload
- `npm run build` - Production build  
- `npm run lint` / `npm run lint:fix` - ESLint checking/fixing
- `npm run cards:update` - Force refresh Scryfall data when stale
- `npm test` - Vitest (test infrastructure ready, no tests yet)

## Architecture

**Tech Stack**: Vue 3.5 + Vite 8 + TypeScript + Element Plus + Apache ECharts

**Key Directories**:
- `src/components/` - Vue components (tables, charts, statistics)
- `src/util/` - Core logic modules (CubeFunctions.mjs, similarity algorithms)
- `data/` - Generated JSON files (cards, flavor words, tagger data)  
- `preloads/` - Downloaded cube data cached locally

**Data Pipeline**: Scryfall API → local processing → CubeCobra API → similarity computation → visualization

## Code Conventions

- **Vue**: Composition API with `<script setup>`, heavy use of `ref()`, `computed()`, `provide()`
- **State**: No Vuex/Pinia - App.vue holds all state, uses custom `bindStorage()` for localStorage
- **Files**: `.mjs` for Node-runnable utilities, `.vue` for components, `.ts` for TypeScript
- **ESLint**: Trailing commas required (multiline), Vue strongly-recommended preset

## Development Notes

**Performance Considerations**:
- Similarity computation is O(n²) and can take minutes for 100+ cubes
- Card data processing involves ~100MB files - use `--max-old-space-size` if needed
- All cube state stored in localStorage (5-10MB limit)

**Common Issues**:
- Run `npm run cards:update` if card data seems stale
- CubeCobra API may timeout on large cube fetches (no retry logic)
- Mobile responsiveness limited - charts may overflow on small screens
- Keywords like "Initiative", "Monarch" not fully recognized by Scryfall Tagger

**Key Design Decisions**:
- Cosine similarity used over Jaccard (better for variable cube sizes)
- Card data uses original printing (CubeCobra overrides ignored)
- Rarity scoring: Common=0.333, Uncommon=0.666, Rare=1.0, Mythic=1.2
