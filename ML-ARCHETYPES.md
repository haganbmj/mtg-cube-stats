# ML Card Clustering

This project uses machine learning to automatically discover clusters of related cards from CubeCobra's community data. Cards that the CubeCobra encoder model considers functionally similar are grouped together, revealing natural synergies and archetypes.

## Overview

The pipeline produces ~75 clusters of related cards. Each cluster contains all member cards sorted by proximity to the cluster centroid (most representative cards first). Clusters are labeled by their top 3 representative card names. When analyzing a cube, each cluster is scored by how many of its member cards appear in the cube.

## Architecture

```
CubeCobra Encoder Model (pre-trained)
        │
        ▼
  Card Embeddings (128-dim vectors)
        │
        ▼
  K-Means Clustering (k=75)
        │
        ▼
  data/cubecobra-archetypes.json
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
