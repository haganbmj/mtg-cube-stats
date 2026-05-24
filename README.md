# [cube.griselbrand.com](https://cube.griselbrand.com)

A tool for analyzing and comparing MTG Cubes from CubeCobra. Originally created to help me figure out what I wanted to draft at CubeCon 2025.

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

The card search syntax is powered by a [Nearley](https://nearley.js.org/) grammar defined in `src/util/cardFilters.grammar.ts`. Edit this file directly to modify the parser rules or lexer tokens.

## Dependencies

- [Vue 3](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Apache ECharts](https://echarts.apache.org/en/index.html) + [vue-echarts](https://github.com/ecomfe/vue-echarts)
- [VueUse](https://vueuse.org/)
- [Mana](https://github.com/andrewgioia/mana)
