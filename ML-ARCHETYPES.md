# ML Card Clustering

This project uses machine learning to automatically discover clusters of related cards from CubeCobra's community data. Cards that the CubeCobra encoder model considers functionally similar are grouped together, revealing natural synergies and archetypes.

## Overview

The pipeline produces 200 clusters of related cards. Each cluster contains all member cards sorted by **distinctiveness** — how exclusively a card belongs to that cluster compared to all others. When analyzing a specific cube, clusters are scored and ranked using a multi-factor significance formula that accounts for global cluster coverage, card distinctiveness, category-relative surprise, and how concentrated the cube is in that cluster relative to its own spread.

## Architecture

```
CubeCobra Encoder Model (pre-trained)
        │
        ▼
  Card Embeddings (128-dim vectors)
        │
        ▼
  K-Means Clustering (k=200)
        │
        ├─── data/cubecobra-archetypes.json
        │         (clusters + card assignments)
        │
        ▼
  Cube Profile Vectors (200-dim)
        │
        ▼
  K-Means Clustering (k=30)
        │
        ▼
  data/cubecobra-cube-categories.json
        (broad cube category centroids)
```

## Pipeline Steps

### Step 1: Card Pool Construction

All non-land cards from Scryfall are included in the card pool. Lands are excluded because mana-fixing lands co-occur with nearly every strategy and pollute clustering results — they are baseline inclusions rather than strategy-defining cards.

The encoder model's vocabulary acts as the natural filter: only cards the model has seen during training receive embeddings and participate in clustering. Currently this yields ~31,000 embedded cards out of ~33,000 non-land Scryfall cards.

### Step 2: CubeCobra Encoder Model

Card embeddings are generated using CubeCobra's pre-trained TensorFlow.js encoder model. This is a 3-layer multi-layer perceptron (MLP) trained on draft and cube recommendation data:

```
Input (35,001 one-hot) → Dense(512, ReLU) → Dense(256, ReLU) → Dense(128, linear)
```

- **Input**: A one-hot vector of length 35,001 (one entry per card in CubeCobra's vocabulary)
- **Hidden layers**: Two fully-connected layers with ReLU activation (512 and 256 units)
- **Output**: A 128-dimensional embedding vector (linear activation — no non-linearity)

The model weights are stored as 18 binary Float32 shards (~69MB total). Rather than depending on TensorFlow.js at runtime, we extract the weight matrices from the binary shards and compute the forward pass manually. For a one-hot input at index `i`, the first layer reduces to a simple row selection from the weight matrix, making the computation efficient.

The model has its own `indexToOracleMap.json` that maps model vocabulary indices to Scryfall Oracle IDs.

### Step 3: Forward Pass

For each card in the pool:

1. Look up the card's index in the model vocabulary
2. **Layer 1**: Select row `i` from W1 (71M params), add bias → ReLU
3. **Layer 2**: Matrix multiply with W2 (131K params), add bias → ReLU
4. **Bottleneck**: Matrix multiply with W3 (33K params), add bias → output (no activation)

Cards not present in the model vocabulary are excluded (~1,800 cards, typically very new or obscure printings).

### Step 4: K-Means Clustering

The 128-dimensional embeddings are clustered using K-means++ with the following parameters:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| k (clusters) | 200 | Fine-grained granularity; allows narrow archetypes to emerge alongside broad color strategies |
| Initialization | kmeans++ | Better initial centroids than random seeding |
| Restarts | 10 | Multiple restarts to avoid poor local optima |
| Seed | 42 | Deterministic results across runs |

### Step 5: Distinctiveness Weighting and Cluster Output

Rather than ranking cards by centroid proximity, each card is ranked by **distinctiveness**: how exclusively it belongs to its primary cluster compared to the next-nearest cluster.

```
distinctiveness = min(d2 / d1, 5.0)
```

Where `d1` is the distance to the nearest centroid and `d2` is the distance to the second-nearest. A ratio of 3.0 means the card is 3× closer to cluster A than cluster B — it strongly identifies that cluster. A ratio near 1.0 means the card sits between clusters (e.g. a generic color staple that appears in many contexts). The ratio is capped at 5.0 to limit outlier influence.

Cards with high distinctiveness float to the top of each cluster. Weights within the output are normalized to [0, 1] within each cluster so they are comparable across clusters regardless of their absolute spread.

Each cluster is labeled by the top 3 most distinctive card names, providing an immediate sense of the archetype.

### Step 6: Card-Cluster Assignments

Each card receives:
- A **primary assignment** to its nearest cluster centroid (weight = raw distinctiveness score)
- **Secondary assignments** to any other centroids within 1.5× the primary distance (weight = 0.5 × primary distinctiveness)

Secondary assignments allow cards that bridge multiple strategies (e.g. a creature that fits both sacrifice and token themes) to surface in multiple cluster analyses without being double-counted at full weight.

### Step 7: Cube Classification

The bulk cube export (`cubes.jsonl`, ~245K cubes) is used to derive broad **cube categories** — 30 cluster centroids representing common cube archetypes at a macro level.

For each qualifying cube (≥ 360 cards with cluster data), a 200-dimensional profile vector is built: each dimension is the fraction of the cube's cards that have a primary assignment to that cluster. These normalized profile vectors are clustered with k-means (k=30, up to 30K cubes sampled for speed).

The resulting 30 category centroids are stored in `cubecobra-cube-categories.json`. At runtime, a cube is classified by nearest-centroid lookup — no recomputation of the full pipeline is needed.

Category labels are derived by identifying the clusters most over-represented in each category relative to the global average across all cubes (ratio of category average to global average).

## Data Flow

### Input Data

| File | Source | Description |
|------|--------|-------------|
| `data/cards-minimized.json` | Scryfall API | Card metadata (types, colors, names) |
| `data/cubecobra-export/model/encoder/model.json` | CubeCobra S3 | TF.js model architecture manifest |
| `data/cubecobra-export/model/encoder/group1-shard*.bin` | CubeCobra S3 | 18 binary weight shards (~69MB) |
| `data/cubecobra-export/model/indexToOracleMap.json` | CubeCobra S3 | Model vocabulary → Oracle ID mapping |
| `data/cubecobra-export/cubes.jsonl` | CubeCobra S3 | Bulk cube export used for cube classification (Step 7) |
| `data/cubecobra-export/indexToOracleMap.json` | CubeCobra S3 | Cube export card index → Oracle ID mapping |

### Output

| File | Description |
|------|-------------|
| `data/cubecobra-archetypes.json` | Cluster definitions, card assignments, metadata (~8.7MB) |
| `data/cubecobra-cube-categories.json` | 30 cube category centroids for runtime cube classification |

`cubecobra-archetypes.json` contains:
- `embeddingDim`: Dimensionality of the embedding space (128)
- `embeddingSource`: Source identifier (`cubecobra-encoder`)
- `numClusters`: Number of clusters discovered
- `cardPoolSize`: Number of embedded cards
- `clusters[]`: Array of cluster definitions, each with `id`, `label`, `memberCount`, and all member cards with `weight` and `name`
- `cardClusters{}`: Map from Oracle ID to an array of cluster assignments (`clusterId`, `weight`) — primary assignment first, then secondaries

`cubecobra-cube-categories.json` contains:
- `numCategories`: Number of categories (30)
- `clusterCount`: Number of archetype clusters (200)
- `categories[]`: Each category has `id`, `memberCount`, `topClusters`, `label`, and a `centroid` vector of length 200

## Running the Pipeline

```bash
# Download model weights and card data (first time)
npm run cubecobra-exports
npm run cards

# Generate clusters and cube categories
npm run archetypes

# Regenerate (overwrites existing output)
npm run archetypes:update
```

## Runtime Cluster Scoring (UI)

When a cube is loaded, its clusters are ranked by a multi-factor **significance score** rather than raw match count. This prevents large mono-color clusters from dominating the list:

```
significance = (matchCount / memberCount)   // global coverage fraction
             × avgEffectiveWeight           // cube-local card distinctiveness
             × categoryRatio               // how unusual this cluster is for this cube type
             × internalConcentration       // how focused the cube is on this vs. other clusters
```

- **Global coverage**: What fraction of the cluster's global members are in this cube? 30/50 is more intentional than 80/500.
- **Cube-local effective weight**: Each card's global distinctiveness is divided by how many other cube clusters it also appears in. Cards that are unique to one cluster within this cube rank higher than generic staples that drift across several.
- **Category ratio**: Compares the cube's actual cluster fraction to the centroid of its category (expected value for cubes of that type). Clusters that are routine for this cube style are penalized; unusual commitments are boosted. Capped at 5×.
- **Internal concentration**: How much of the cube's total archetype signal goes to this cluster relative to the per-cluster average. A cube with 60 cards concentrated in one cluster scores higher than one evenly spread across 30.

After scoring, a **greedy Jaccard deduplication** pass removes clusters whose matched card sets overlap too heavily with a higher-ranked cluster (configurable threshold, default 0.5). This prevents near-duplicate clusters from crowding the list.

## Dependencies

- **ml-kmeans** (v7): K-means++ clustering implementation
- No TensorFlow.js dependency — forward pass is computed manually from raw weight buffers

## Design Decisions

### Why CubeCobra's encoder over custom embeddings?

CubeCobra's encoder is trained on actual draft and cube recommendation data from hundreds of thousands of cubes. This captures card relationships that reflect how players actually use cards together, rather than relying on raw co-occurrence statistics or card text analysis. The pre-trained model provides high-quality embeddings without expensive local computation.

### Why exclude lands?

Mana-fixing lands (duals, fetches, shocks, etc.) appear in nearly every cube regardless of strategy composition. Including them causes clusters to form around color pairs based on mana base rather than strategic themes. Excluding lands lets the clustering focus on cards that define gameplay strategies.

### Why manual forward pass instead of TensorFlow.js?

The encoder is a simple 3-layer MLP. For one-hot inputs, the first layer is a row selection — no matrix multiplication needed. The entire forward pass for ~31,000 cards takes under 5 seconds in plain TypeScript. Adding TF.js as a dependency (~50MB) for this is unnecessary.

### Why distinctiveness instead of centroid proximity?

Earlier iterations ranked cards within a cluster by distance to centroid (closest = most representative). This caused large mono-color clusters to dominate results: a card like Counterspell sits near the centroid of a blue cluster, but only because most blue cards cluster together — not because Counterspell is strategically distinctive. Distinctiveness (d2/d1 ratio) instead asks: "how much more does this card belong to cluster A than the next-best cluster?" Cards with high exclusivity float to the top, while generic staples that could fit anywhere sink.

### Why 200 clusters?

With k=75, many narrow but real archetypes (e.g. "Reanimator", "Storm", "Affinity") merged into broad color-pair buckets. At k=200, each MTG color pair and major cross-color strategy can have its own cluster. The fine granularity means cube comparisons surface more specific and actionable archetype overlaps. The Jaccard deduplication in the UI prevents the increased cluster count from overwhelming the display.

### Why card names instead of tag-based labels?

Earlier iterations used TF-IDF scoring over CubeCobra's card tags to generate archetype labels (e.g., "Burn Creature", "Sacrifice Outlet"). This produced labels that were often too generic or misleading — the tags are community-sourced metadata that don't always reflect the model's actual clustering logic. Using the top representative card names as labels is more direct and immediately communicates what cards the cluster groups together, letting users draw their own conclusions about the strategy.

## Pipeline Steps

### Step 1: Card Pool Construction

All non-land cards from Scryfall are included in the card pool. Lands are excluded because mana-fixing lands co-occur with nearly every strategy and pollute clustering results — they are baseline inclusions rather than strategy-defining cards.

The encoder model's vocabulary acts as the natural filter: only cards the model has seen during training receive embeddings and participate in clustering. Currently this yields ~31,000 embedded cards out of ~33,000 non-land Scryfall cards.

### Step 2: CubeCobra Encoder Model

Card embeddings are generated using CubeCobra's pre-trained TensorFlow.js encoder model. This is a 3-layer multi-layer perceptron (MLP) trained on draft and cube recommendation data:

```
Input (35,001 one-hot) → Dense(512, ReLU) → Dense(256, ReLU) → Dense(128, linear)
```

- **Input**: A one-hot vector of length 35,001 (one entry per card in CubeCobra's vocabulary)
- **Hidden layers**: Two fully-connected layers with ReLU activation (512 and 256 units)
- **Output**: A 128-dimensional embedding vector (linear activation — no non-linearity)

The model weights are stored as 18 binary Float32 shards (~69MB total). Rather than depending on TensorFlow.js at runtime, we extract the weight matrices from the binary shards and compute the forward pass manually. For a one-hot input at index `i`, the first layer reduces to a simple row selection from the weight matrix, making the computation efficient.

The model has its own `indexToOracleMap.json` that maps model vocabulary indices to Scryfall Oracle IDs.

### Step 3: Forward Pass

For each card in the pool:

1. Look up the card's index in the model vocabulary
2. **Layer 1**: Select row `i` from W1 (71M params), add bias → ReLU
3. **Layer 2**: Matrix multiply with W2 (131K params), add bias → ReLU
4. **Bottleneck**: Matrix multiply with W3 (33K params), add bias → output (no activation)

Cards not present in the model vocabulary are excluded (~1,800 cards, typically very new or obscure printings).

### Step 4: K-Means Clustering

The 128-dimensional embeddings are clustered using K-means++ with the following parameters:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| k (clusters) | 75 | Targets a granularity of ~50-100 distinct groupings |
| Initialization | kmeans++ | Better initial centroids than random seeding |
| Restarts | 10 | Multiple restarts to avoid poor local optima |
| Seed | 42 | Deterministic results across runs |

Each card is assigned to the nearest centroid. Distance to centroid serves as a representativeness score — cards closer to the center are more characteristic of the cluster.

### Step 5: Cluster Output

Each cluster includes all of its member cards sorted by distance to the centroid (closest first). Cards receive a weight from 0 to 1 based on their relative distance within the cluster, where 1.0 means closest to center.

The cluster label is the names of the top 3 most representative cards (e.g., "Llanowar Elves, Elder Gargaroth, Sakura-Tribe Elder"), providing an immediate sense of what the cluster contains.

### Step 6: Card-Cluster Assignments

Each card receives:
- A **primary assignment** to its nearest cluster centroid (weight = 1.0)
- **Secondary assignments** to any other centroids within 1.5× the primary distance, with weight inversely proportional to the distance ratio

This allows cards that bridge multiple clusters (e.g., a creature that fits both sacrifice and token strategies) to appear in multiple cluster results.

## Data Flow

### Input Data

| File | Source | Description |
|------|--------|-------------|
| `data/cards-minimized.json` | Scryfall API | Card metadata (types, colors, names) |
| `data/cubecobra-export/model/encoder/model.json` | CubeCobra S3 | TF.js model architecture manifest |
| `data/cubecobra-export/model/encoder/group1-shard*.bin` | CubeCobra S3 | 18 binary weight shards (~69MB) |
| `data/cubecobra-export/model/indexToOracleMap.json` | CubeCobra S3 | Model vocabulary → Oracle ID mapping |

### Output

| File | Description |
|------|-------------|
| `data/cubecobra-archetypes.json` | Cluster definitions, card assignments, metadata |

The output JSON contains:
- `embeddingDim`: Dimensionality of the embedding space (128)
- `embeddingSource`: Source identifier (`cubecobra-encoder`)
- `clusters[]`: Array of cluster definitions, each with label, all member cards (with weights), and member count
- `cardClusters{}`: Map from Oracle ID to cluster assignments with weights

## Running the Pipeline

```bash
# Download model weights and card data (first time)
npm run cubecobra-exports
npm run cards

# Generate clusters
npm run archetypes

# Regenerate (overwrites existing output)
npm run archetypes:update
```

## Dependencies

- **ml-kmeans** (v7): K-means++ clustering implementation
- No TensorFlow.js dependency — forward pass is computed manually from raw weight buffers

## Design Decisions

### Why CubeCobra's encoder over custom embeddings?

CubeCobra's encoder is trained on actual draft and cube recommendation data from hundreds of thousands of cubes. This captures card relationships that reflect how players actually use cards together, rather than relying on raw co-occurrence statistics or card text analysis. The pre-trained model provides high-quality embeddings without expensive local computation.

### Why exclude lands?

Mana-fixing lands (duals, fetches, shocks, etc.) appear in nearly every cube regardless of strategy composition. Including them causes clusters to form around color pairs based on mana base rather than strategic themes. Excluding lands lets the clustering focus on cards that define gameplay strategies.

### Why manual forward pass instead of TensorFlow.js?

The encoder is a simple 3-layer MLP. For one-hot inputs, the first layer is a row selection — no matrix multiplication needed. The entire forward pass for ~31,000 cards takes under 5 seconds in plain TypeScript. Adding TF.js as a dependency (~50MB) for this is unnecessary.

### Why card names instead of tag-based labels?

Earlier iterations used TF-IDF scoring over CubeCobra's card tags to generate archetype labels (e.g., "Burn Creature", "Sacrifice Outlet"). This produced labels that were often too generic or misleading — the tags are community-sourced metadata that don't always reflect the model's actual clustering logic. Using the top representative card names as labels is more direct and immediately communicates what cards the cluster groups together, letting users draw their own conclusions about the strategy.
