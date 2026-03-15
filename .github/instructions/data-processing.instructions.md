---
description: "Use when working with data processing utilities, API integrations, mathematical computations, performance optimization, or handling Scryfall/CubeCobra data transformations."
applyTo: "src/util/**/*.mjs"
---

# Data Processing Guidelines

## Performance Patterns

**Memoization**: Use `useMemoize` for expensive computations:
```javascript
import { useMemoize } from '@vueuse/core';
const expensiveComputation = useMemoize((data) => {
    // Heavy processing here
});
```

**Profiling**: Always profile data-heavy operations:
```javascript
console.time('Loading Scryfall card data');
scryfall = (await scryfallLoad());
console.timeEnd('Loading Scryfall card data');
```

**Manual Optimization**: Prefer single loops over multiple array methods for performance:
```javascript
// Preferred - single iteration
function vectorCosineSimilarity(vecA, vecB) {
    let dotProduct = 0, magnitudeA = 0, magnitudeB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
```

## Data Validation & Resilience

**Defensive Programming**: Use optional chaining and nullish coalescing for external data:
```javascript
const enrichedCard = {
    name: scryfallCard?.name ?? 'Unknown Card',
    cmc: scryfallCard?.cmc ?? 0,
    colorIdentity: scryfallCard?.colorIdentity ?? [],
    rarity: scryfallCard?.rarity ?? undefined,
};
```

**Missing Data Warnings**: Log missing enrichment data for debugging:
```javascript
if (!scryfallCard) {
    console.warn(`Missing Scryfall data for card: ${card.oracleId}`);
}
```

**Array Safety**: Always handle potentially empty arrays:
```javascript
categoryPrefixes: (cube.categoryPrefixes ?? []).sort(),
followerCount: cube.following?.length ?? 0
```

## Data Processing Pipeline

Follow the **Remap → Enrich → Analyze** pattern:

1. **Remap**: Transform external API responses to internal format
2. **Enrich**: Add computed fields and merge data sources  
3. **Analyze**: Generate statistics and derived metrics

```javascript
export function remapCube(cube, enrich = true) {
    const remappedCube = {
        // Extract and normalize API response
        id: cube.id,
        cards: cube.cards.mainboard.map(card => ({
            printingId: card.details.scryfall_id,
            oracleId: card.details.oracle_id,
        })),
    };
    
    return enrich ? enrichCube(remappedCube) : remappedCube;
}
```

## API Error Handling

**Consistent Error Patterns**: Log and re-throw with context:
```javascript
export async function getCubeData(cubeId) {
    try {
        return (await axios.get(`/api/cube/${cubeId}`)).data;
    } catch (e) {
        console.error(`Failed to fetch cube: ${cubeId}, status: ${e.status}, message: ${e.message}`);
        throw e; // Re-throw for caller handling
    }
}
```

**Graceful Degradation**: Provide fallbacks for non-critical data:
```javascript
const enrichedCard = {
    // Critical data - will throw if missing
    oracleId: card.oracle_id,
    // Optional data - graceful fallbacks
    minPriceUsd: scryfallCard?.pricing?.usd ?? null,
    games: scryfallCard?.games ?? [], // Custom cards won't have games
};
```

## Mathematical Computations

**Edge Case Handling**: Always check for division by zero:
```javascript
if (magnitudeA === 0 || magnitudeB === 0) {
    return 0; // Cannot compute similarity
}
return dotProduct / (magnitudeA * magnitudeB);
```

**Set Operations**: Use native Set for intersection/union calculations:
```javascript
export function jaccardSimilarity(listA, listB) {
    const intersection = new Set([...listA].filter(x => listB.includes(x)));
    const union = new Set([...listA, ...listB]);
    return intersection.size / union.size;
}
```

## Memory Management

**Lazy Loading**: Only load heavy data when needed:
```javascript
const scryfallLoad = () => import('../../data/cards-minimized.json');
var scryfall = null; // Global cache

export async function initScryfall() {
    if (!scryfall) {
        scryfall = await scryfallLoad();
    }
}
```

**Avoid Memory Leaks**: Use Maps for temporary lookups, clear when done:
```javascript
const lookupMap = new Map();
// ... use map
lookupMap.clear(); // Free memory
```

## Common Anti-patterns

- **Don't** use multiple reduce/map chains when one loop suffices
- **Don't** ignore optional chaining for external API data
- **Don't** forget to handle empty arrays/objects from APIs
- **Don't** skip profiling for O(n²) or data-heavy operations
- **Don't** throw errors without logging context for debugging
