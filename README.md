# mtg-cube-stats

## Development Setup

```sh
# Install dependencies
npm install

# Load and process Scryfall card data
npm run cards

# Preload Cube data
npm run preload

# Start development server
npm run serve
```

Additional Commands

```sh
# Force refresh Scryfall card data
npm run cards:update
```

The card search syntax is powered by a [Nearley](https://nearley.js.org/) grammar. The compiled parser is checked into version control, so you do not need to recompile unless you modify the grammar.

**Grammar source**: `src/util/cardFilters.ne`  
**Compiled output (CJS)**: `src/util/cardFilters.generated.cjs`  
**ESM wrapper**: `src/util/cardFilters.grammar.ts` — mirrors the compiled grammar for Vite bundling

To recompile after editing the grammar:

```sh
npm run nearley
```

After recompiling, manually update `src/util/cardFilters.grammar.ts` to reflect any changes to the `Lexer` definition or `ParserRules` array in the generated `.cjs` file.

## Dependencies

- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Apache ECharts](https://echarts.apache.org/en/index.html) + [vue-echarts](https://github.com/ecomfe/vue-echarts)
- [VueUse](https://vueuse.org/)
- [Mana](https://github.com/andrewgioia/mana)
