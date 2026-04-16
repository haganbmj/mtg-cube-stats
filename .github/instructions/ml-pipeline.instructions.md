---
applyTo: "compute-archetypes.ts,src/util/MLArchetypeDetection.ts,src/util/CubeCategoryDetection.ts,src/components/charts/ClusterGraphChart.vue"
---

# ML Pipeline Documentation

`ML-ARCHETYPES.md` in the repository root is the authoritative documentation for the ML clustering pipeline and its UI. Keep it up to date whenever you change any of the following:

- **`compute-archetypes.ts`**: Update if any tunable parameter changes (k, restarts, thresholds), a pipeline step is added/removed/renamed, the distinctiveness formula changes, the weighting strategy changes, input/output files change, or the cube classification logic (Step 7) changes.
- **`src/util/MLArchetypeDetection.ts`** or **`src/util/CubeCategoryDetection.ts`**: Update if the runtime data structures, exported functions, or classification logic change in a way that affects how clusters are loaded or applied.
- **`src/components/charts/ClusterGraphChart.vue`**: Update the "Runtime Cluster Scoring" section if the significance formula, Jaccard deduplication logic, or UI filtering parameters change.

Sections most likely to need updates:
- **Overview** — cluster count, high-level description
- **Step 4 parameter table** — k, restarts, seed
- **Step 5** — distinctiveness formula and card ranking
- **Step 6** — assignment weights and secondary threshold
- **Step 7** — cube classification parameters
- **Output** — file names, JSON field descriptions
- **Runtime Cluster Scoring** — significance formula components, deduplication
- **Design Decisions** — add a new entry when a significant algorithmic choice is made
