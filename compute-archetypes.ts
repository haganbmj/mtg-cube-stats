import fs from 'fs';
import { kmeans } from 'ml-kmeans';

const EXPORT_DIR = './data/cubecobra-export';
const CARDS_MINIMIZED = './data/cards-minimized.json';
const MODEL_DIR = `${EXPORT_DIR}/model`;
const ENCODER_DIR = `${MODEL_DIR}/encoder`;
const MODEL_INDEX_MAP = `${MODEL_DIR}/indexToOracleMap.json`;
const MODEL_JSON = `${ENCODER_DIR}/model.json`;
const CUBES_JSONL = `${EXPORT_DIR}/cubes.jsonl`;
const INDEX_TO_ORACLE = `${EXPORT_DIR}/indexToOracleMap.json`;
const OUTPUT_FILE = './data/cubecobra-archetypes.json';
const CATEGORIES_FILE = './data/cubecobra-cube-categories.json';
const TAG_CATEGORIES_FILE = './data/cubecobra-tag-categories.json';

// ---------------------------------------------------------------------------
// Tunable parameters
// ---------------------------------------------------------------------------

// Number of archetypes (k-means clusters) to discover.
const NUM_ARCHETYPES = 150;
// Number of k-means restarts for stability.
const KMEANS_RESTARTS = 10;
// Cube classification: broad cube categories derived from cluster profiles.
const NUM_CUBE_CATEGORIES = 30;
// Minimum cube size (cards) to include in cube classification.
const MIN_CUBE_CARDS = 360;
// Maximum cubes to use for k-means fit (random sample for speed).
const CUBE_KMEANS_SAMPLE = 30000;
// Restarts for cube-level k-means (fewer needed, lower dimensionality).
const CUBE_KMEANS_RESTARTS = 5;
// Minimum number of cards a Scryfall Tagger tag must appear on to join the vocabulary.
const MIN_TAG_CARD_COUNT = 100;

const isUpdate = process.argv[2] === '--update';

// ---------------------------------------------------------------------------
// Prerequisite checks
// ---------------------------------------------------------------------------

for (const file of [CARDS_MINIMIZED, MODEL_JSON, MODEL_INDEX_MAP]) {
    if (!fs.existsSync(file)) {
        console.error(`Missing prerequisite: ${file}`);
        console.error('Run `npm run cards` and `npm run cubecobra-exports` first.');
        process.exit(1);
    }
}

if (fs.existsSync(OUTPUT_FILE) && !isUpdate) {
    console.log(`${OUTPUT_FILE} already exists. Use --update to regenerate.`);
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Step 1: Build card pool
// ---------------------------------------------------------------------------

console.log('Step 1: Building card pool ...');
console.time('card-pool');

const cardsMinimized = JSON.parse(fs.readFileSync(CARDS_MINIMIZED, 'utf8'));

// Include all non-land cards known to Scryfall. The encoder model vocabulary
// acts as the natural filter in Step 3 — only cards the model knows about
// receive embeddings and participate in clustering.
// Lands are excluded because mana-fixing lands co-occur with everything and
// pollute archetype clusters as baseline inclusions.
const cardPool = Object.keys(cardsMinimized.cards)
    .filter((oracleId) => {
        const card = cardsMinimized.cards[oracleId];
        if (card?.effectiveTypes?.includes('Land')) return false;
        return true;
    });

cardPool.sort(); // deterministic ordering

console.log(`Card pool: ${cardPool.length} non-land cards from Scryfall`);
interface CardMeta {
    name: string;
    colorIdentity: string[];
    typeLine: string;
    effectiveTypes: string[];
}
const cardMeta = new Map<string, CardMeta>();
for (const oracleId of cardPool) {
    const card = cardsMinimized.cards[oracleId];
    if (card) {
        cardMeta.set(oracleId, {
            name: card.name ?? 'Unknown',
            colorIdentity: card.colorIdentity ?? [],
            typeLine: card.typeLine ?? '',
            effectiveTypes: card.effectiveTypes ?? [],
        });
    }
}

console.timeEnd('card-pool');

// ---------------------------------------------------------------------------
// Step 2: Load CubeCobra encoder model weights
// ---------------------------------------------------------------------------
// The encoder is a 3-layer MLP trained by CubeCobra on draft/cube data:
//   Input (35001) → Dense(512, ReLU) → Dense(256, ReLU) → Dense(128, linear)
// We extract the weight matrices from the TF.js binary shards and compute
// the forward pass manually — no TF.js dependency needed.

console.log('Step 2: Loading encoder model weights ...');
console.time('load-model');

const modelSpec = JSON.parse(fs.readFileSync(MODEL_JSON, 'utf8'));
const manifest = modelSpec.weightsManifest[0];

// Concatenate all binary shard files into a single buffer.
const shardBuffers = manifest.paths.map((p: string) =>
    fs.readFileSync(`${ENCODER_DIR}/${p}`),
);
const allWeights = Buffer.concat(shardBuffers);

// Slice weights according to the manifest. Each weight is stored sequentially as float32.
interface WeightSpec { name: string; shape: number[]; dtype: string }
const weights = new Map<string, { data: Float32Array; shape: number[] }>();
let offset = 0;
for (const w of manifest.weights as WeightSpec[]) {
    const numElements = w.shape.reduce((a: number, b: number) => a * b, 1);
    const byteLength = numElements * 4; // float32
    const data = new Float32Array(allWeights.buffer, allWeights.byteOffset + offset, numElements);
    weights.set(w.name, { data, shape: w.shape });
    offset += byteLength;
}

// Extract the 3 layer weight matrices and biases.
function getWeight(nameFragment: string): { data: Float32Array; shape: number[] } {
    for (const [name, w] of weights) {
        if (name.includes(nameFragment)) return w;
    }
    throw new Error(`Weight not found: ${nameFragment}`);
}

const W1 = getWeight('encoder_e1/MatMul');     // [35001, 512]
const b1 = getWeight('encoder_e1/BiasAdd');     // [512]
const W2 = getWeight('encoder_e3/MatMul');      // [512, 256]
const b2 = getWeight('encoder_e3/BiasAdd');     // [256]
const W3 = getWeight('encoder_bottleneck/MatMul');  // [256, 128]
const b3 = getWeight('encoder_bottleneck/BiasAdd'); // [128]

console.log(`  Layer 1: [${W1.shape}], Layer 2: [${W2.shape}], Bottleneck: [${W3.shape}]`);

// Load the model's own indexToOracleMap (different from export/indexToOracleMap.json).
const modelIndexToOracle: Record<string, string> = JSON.parse(fs.readFileSync(MODEL_INDEX_MAP, 'utf8'));
const oracleToModelIndex = new Map<string, number>();
for (const [idx, oracleId] of Object.entries(modelIndexToOracle)) {
    oracleToModelIndex.set(oracleId, Number(idx));
}

console.log(`  Model vocabulary: ${oracleToModelIndex.size} cards`);
console.timeEnd('load-model');

// ---------------------------------------------------------------------------
// Step 3: Compute card embeddings via encoder forward pass
// ---------------------------------------------------------------------------
// For a one-hot input at model index i, the first layer output is just
// row i of W1 plus b1. Then we apply the remaining layers.

console.log('Step 3: Computing card embeddings ...');
console.time('embeddings');

const embeddingDim = W3.shape[1]; // 128
const embeddings: number[][] = [];
const embeddedCards: string[] = []; // oracle IDs of cards with embeddings
let missingFromModel = 0;

for (const oracleId of cardPool) {
    const modelIdx = oracleToModelIndex.get(oracleId);
    if (modelIdx === undefined) {
        missingFromModel++;
        continue;
    }

    // Layer 1: h1 = ReLU(W1[modelIdx, :] + b1)
    // W1 is stored row-major as [35001, 512], so row modelIdx starts at modelIdx * 512
    const h1 = new Float64Array(W1.shape[1]);
    const w1Offset = modelIdx * W1.shape[1];
    for (let j = 0; j < W1.shape[1]; j++) {
        h1[j] = Math.max(0, W1.data[w1Offset + j] + b1.data[j]); // ReLU
    }

    // Layer 2: h2 = ReLU(W2^T @ h1 + b2)
    // W2 is [512, 256], stored row-major. Column j of output = sum of h1[i] * W2[i][j]
    const h2 = new Float64Array(W2.shape[1]);
    for (let j = 0; j < W2.shape[1]; j++) {
        let sum = b2.data[j];
        for (let i = 0; i < W2.shape[0]; i++) {
            sum += h1[i] * W2.data[i * W2.shape[1] + j];
        }
        h2[j] = Math.max(0, sum); // ReLU
    }

    // Bottleneck: emb = W3^T @ h2 + b3 (no activation)
    const emb = new Array(embeddingDim);
    for (let j = 0; j < embeddingDim; j++) {
        let sum = b3.data[j];
        for (let i = 0; i < W3.shape[0]; i++) {
            sum += h2[i] * W3.data[i * embeddingDim + j];
        }
        emb[j] = sum;
    }

    embeddings.push(emb);
    embeddedCards.push(oracleId);
}

const numEmbedded = embeddedCards.length;
console.log(`  Computed ${numEmbedded} embeddings (${missingFromModel} cards not in model vocabulary)`);
console.timeEnd('embeddings');

// ---------------------------------------------------------------------------
// Step 4: K-means clustering
// ---------------------------------------------------------------------------

console.log(`Step 4: K-means clustering (k=${NUM_ARCHETYPES}, restarts=${KMEANS_RESTARTS}) ...`);
console.time('kmeans');

const kmeansResult = kmeans(embeddings, NUM_ARCHETYPES, {
    initialization: 'kmeans++',
    seed: 42,
});

const { centroids } = kmeansResult;
console.timeEnd('kmeans');

// ---------------------------------------------------------------------------
// Step 5: Compute card distinctiveness and build cluster outputs
// ---------------------------------------------------------------------------
// For each card we compute distances to ALL k centroids.  The "distinctiveness"
// of a card for its primary cluster is the ratio:
//
//   distinctiveness = distance_to_2nd_nearest / distance_to_nearest
//
// A ratio of 3 means the card is 3× closer to cluster A than cluster B — it
// strongly identifies cluster A.  A ratio near 1 means the card sits between
// clusters (e.g. a generic color staple that appears everywhere).
//
// Using distinctiveness as the sort key, each cluster's representative cards
// are those most exclusive to it, not merely those closest to its centroid.

console.log('Step 5: Computing card distinctiveness and building cluster outputs ...');
console.time('clusters');

interface CardDistData {
    kIdx: number;           // primary k-means cluster index
    distinctiveness: number;// d2/d1, capped at 5.0 (higher = more exclusive)
    secondaryKIdxs: number[];// k-means indices within 1.5× of primary distance
}

const cardDistData: CardDistData[] = [];

for (let i = 0; i < numEmbedded; i++) {
    const embedding = embeddings[i];

    // Compute L2 distance from this embedding to every centroid.
    const allDists: { kIdx: number; dist: number }[] = new Array(centroids.length);
    for (let k = 0; k < centroids.length; k++) {
        const centroid = centroids[k];
        let distSq = 0;
        for (let d = 0; d < embeddingDim; d++) {
            const diff = embedding[d] - centroid[d];
            distSq += diff * diff;
        }
        allDists[k] = { kIdx: k, dist: Math.sqrt(distSq) };
    }
    allDists.sort((a, b) => a.dist - b.dist);

    const d1 = allDists[0].dist;
    const d2 = allDists[1]?.dist ?? d1 * 5;
    // Guard against degenerate d1 ≈ 0 (card exactly at centroid).
    const distinctiveness = Math.min(d1 > 1e-9 ? d2 / d1 : 5.0, 5.0);

    // Secondary assignments: any centroid within 1.5× of primary distance.
    const secondaryKIdxs: number[] = [];
    for (let j = 1; j < Math.min(allDists.length, 6); j++) {
        if (allDists[j].dist > d1 * 1.5) break;
        secondaryKIdxs.push(allDists[j].kIdx);
    }

    cardDistData.push({
        kIdx: allDists[0].kIdx,
        distinctiveness,
        secondaryKIdxs,
    });
}

// Build per-cluster card lists sorted by distinctiveness DESC.
interface ClusterCard {
    oracleId: string;
    distinctiveness: number;
}

const clusterCards: ClusterCard[][] = Array.from({ length: NUM_ARCHETYPES }, () => []);

for (let i = 0; i < numEmbedded; i++) {
    clusterCards[cardDistData[i].kIdx].push({
        oracleId: embeddedCards[i],
        distinctiveness: cardDistData[i].distinctiveness,
    });
}

// Sort by distinctiveness DESC — most exclusive cards first.
for (const cards of clusterCards) {
    cards.sort((a, b) => b.distinctiveness - a.distinctiveness);
}

// ---------------------------------------------------------------------------
// (continued Step 5) Build cluster output objects
// Each cluster is represented by all its member cards sorted by proximity
// to the centroid. The label is derived from the top representative cards.

console.log('Step 5: Building cluster output ...');
console.time('clusters');

interface ClusterOutput {
    id: number;
    label: string;
    cards: { oracleId: string; weight: number; name: string }[];
    memberCount: number;
}

const clusterOutputs: ClusterOutput[] = [];

for (let k = 0; k < NUM_ARCHETYPES; k++) {
    const members = clusterCards[k];
    if (members.length === 0) continue;

    // Normalize distinctiveness to [0, 1] within this cluster so weights are
    // comparable across clusters regardless of their absolute spread.
    const maxD = members[0].distinctiveness;
    const minD = members[members.length - 1].distinctiveness;
    const range = maxD - minD > 0 ? maxD - minD : 1;

    const cards = members.map(({ oracleId, distinctiveness }) => ({
        oracleId,
        weight: Math.round(((distinctiveness - minD) / range) * 1000) / 1000,
        name: cardMeta.get(oracleId)?.name ?? 'Unknown',
    }));

    // Label: top 3 most distinctive card names (highest exclusivity first).
    const label = cards.slice(0, 3).map(c => c.name).join(', ');

    clusterOutputs.push({
        id: k,
        label,
        cards,
        memberCount: members.length,
    });
}

// Sort clusters by member count descending, reassign IDs.
clusterOutputs.sort((a, b) => b.memberCount - a.memberCount);
// Track original k-means index before ID reassignment.
const kIdxToClusterId = new Map<number, number>();
for (const cluster of clusterOutputs) {
    kIdxToClusterId.set(cluster.id, cluster.id); // temporary (id still = kIdx here)
}
clusterOutputs.forEach((c, i) => {
    kIdxToClusterId.set(c.id, i); // remap kIdx → new sorted id
    c.id = i;
});

console.timeEnd('clusters');

// ---------------------------------------------------------------------------
// Step 6: Build card → cluster lookup
// ---------------------------------------------------------------------------

console.log('Step 6: Building card-cluster lookup ...');
console.time('card-lookup');

interface CardClusterAssignment {
    clusterId: number;
    weight: number;
}

const cardClusters: Record<string, CardClusterAssignment[]> = {};

// cardDistData already contains per-card kIdx, distinctiveness, and secondaryKIdxs
// from Step 5. We just need to translate k-means indices to cluster output IDs.

for (let i = 0; i < numEmbedded; i++) {
    const oracleId = embeddedCards[i];
    const { kIdx, distinctiveness, secondaryKIdxs } = cardDistData[i];

    const primaryClusterId = kIdxToClusterId.get(kIdx);
    if (primaryClusterId === undefined) continue;

    // Primary assignment: weight = distinctiveness (capped at 5, normalized to cluster's [0,1] range in Step 5).
    // Use the raw distinctiveness here so the scale is consistent across clusters.
    const assignments: CardClusterAssignment[] = [{
        clusterId: primaryClusterId,
        weight: Math.round(distinctiveness * 1000) / 1000,
    }];

    // Secondary assignments for cards near multiple cluster boundaries.
    for (const secKIdx of secondaryKIdxs) {
        const secClusterId = kIdxToClusterId.get(secKIdx);
        if (secClusterId === undefined) continue;
        // Secondary weight is lower — use half of primary distinctiveness as a proxy.
        assignments.push({
            clusterId: secClusterId,
            weight: Math.round((distinctiveness * 0.5) * 1000) / 1000,
        });
    }

    cardClusters[oracleId] = assignments;
}

console.timeEnd('card-lookup');

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log('Writing output ...');

const output = {
    embeddingDim: embeddingDim,
    embeddingSource: 'cubecobra-encoder',
    numClusters: clusterOutputs.length,
    cardPoolSize: numEmbedded,
    clusters: clusterOutputs,
    cardClusters,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));

const fileSizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
console.log(`Wrote ${OUTPUT_FILE} (${fileSizeKB} KB)`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n--- Summary ---');
console.log(`Card pool: ${numEmbedded} cards (${missingFromModel} excluded — not in model vocabulary)`);
console.log(`Clusters discovered: ${clusterOutputs.length}`);
console.log(`Cards with cluster assignments: ${Object.keys(cardClusters).length}`);

console.log('\nClusters by size:');
for (const c of clusterOutputs.slice(0, 20)) {
    console.log(`  [${c.memberCount} cards] ${c.label}`);
}
if (clusterOutputs.length > 20) {
    console.log(`  ... and ${clusterOutputs.length - 20} more`);
}

// ---------------------------------------------------------------------------
// Step 7: Cube classification by archetype profile
// ---------------------------------------------------------------------------
// Represent each cube as a normalized cluster-count vector, cluster those
// vectors to find broad cube categories, then output the category centroids.
// The browser classifies loaded cubes at runtime by nearest-centroid lookup.
// ---------------------------------------------------------------------------

console.log('\nStep 7: Classifying cubes by archetype profile ...');
console.time('cube-categories');

if (!fs.existsSync(CUBES_JSONL) || !fs.existsSync(INDEX_TO_ORACLE)) {
    console.log('  Skipping cube classification — cubes.jsonl or indexToOracleMap.json not found.');
    console.log('  Run `npm run cubecobra-exports` to download the bulk export.');
} else {
    const indexToOracle: Record<string, string> = JSON.parse(fs.readFileSync(INDEX_TO_ORACLE, 'utf8'));
    const numClusters = clusterOutputs.length;

    // Build cluster profile for each qualifying cube.
    console.log(`  Reading cubes (min ${MIN_CUBE_CARDS} cards) ...`);
    const cubeProfiles: number[][] = [];
    let skippedSmall = 0, skippedNoCards = 0;

    const cubeLines = fs.readFileSync(CUBES_JSONL, 'utf8').split('\n');
    for (const line of cubeLines) {
        if (!line.trim()) continue;
        let cube: { id: string; cards: number[]; card_count: number };
        try { cube = JSON.parse(line); } catch { continue; }

        if (cube.card_count < MIN_CUBE_CARDS) { skippedSmall++; continue; }

        // Use primary cluster assignment only for a clean positional signal.
        const profile = new Array<number>(numClusters).fill(0);
        let validCards = 0;

        for (const idx of cube.cards) {
            const oracleId = indexToOracle[idx];
            if (!oracleId) continue;
            const assignments = cardClusters[oracleId];
            if (!assignments || assignments.length === 0) continue;
            // Primary assignment = index 0 (highest weight / nearest centroid)
            profile[assignments[0].clusterId]++;
            validCards++;
        }

        if (validCards < MIN_CUBE_CARDS / 2) { skippedNoCards++; continue; }

        // Normalize by valid card count.
        for (let j = 0; j < numClusters; j++) profile[j] /= validCards;
        cubeProfiles.push(profile);
    }

    console.log(`  Qualifying cubes: ${cubeProfiles.length} (skipped ${skippedSmall} too small, ${skippedNoCards} no cluster data)`);

    if (cubeProfiles.length < NUM_CUBE_CATEGORIES) {
        console.log('  Not enough cubes for classification, skipping.');
    } else {
        // Random sample for k-means fit (deterministic via sort seed).
        const sampleSize = Math.min(CUBE_KMEANS_SAMPLE, cubeProfiles.length);
        // Deterministic shuffle using a simple LCG.
        const shuffled = [...cubeProfiles];
        let seed = 12345;
        for (let i = shuffled.length - 1; i > 0; i--) {
            seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
            const j = seed % (i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const sample = shuffled.slice(0, sampleSize);

        console.log(`  Running k-means on ${sample.length} cubes (k=${NUM_CUBE_CATEGORIES}, restarts=${CUBE_KMEANS_RESTARTS}) ...`);
        console.time('cube-kmeans');
        const catResult = kmeans(sample, NUM_CUBE_CATEGORIES, {
            initialization: 'kmeans++',
            seed: 42,
            maxIterations: 100,
        });
        console.timeEnd('cube-kmeans');

        const categoryCentroids = catResult.centroids as number[][];

        // Assign all profiles to nearest centroid to get category counts.
        const categoryCounts = new Array<number>(NUM_CUBE_CATEGORIES).fill(0);
        const categoryClusterSums: number[][] = Array.from(
            { length: NUM_CUBE_CATEGORIES },
            () => new Array<number>(numClusters).fill(0),
        );

        for (const profile of cubeProfiles) {
            let minDist = Infinity, nearest = 0;
            for (let c = 0; c < categoryCentroids.length; c++) {
                let d = 0;
                for (let j = 0; j < numClusters; j++) {
                    const diff = profile[j] - categoryCentroids[c][j];
                    d += diff * diff;
                }
                if (d < minDist) { minDist = d; nearest = c; }
            }
            categoryCounts[nearest]++;
            for (let j = 0; j < numClusters; j++) categoryClusterSums[nearest][j] += profile[j];
        }

        // Compute global average cluster weights across all cube profiles.
        const globalAvg = new Array<number>(numClusters).fill(0);
        for (const profile of cubeProfiles) {
            for (let j = 0; j < numClusters; j++) globalAvg[j] += profile[j];
        }
        for (let j = 0; j < numClusters; j++) globalAvg[j] /= cubeProfiles.length;

        // Build category definitions: label by top over-represented clusters.
        interface CubeCategory {
            id: number;
            memberCount: number;
            topClusters: number[];
            label: string;
            centroid: number[];
        }
        const categoryDefs: CubeCategory[] = Array.from({ length: NUM_CUBE_CATEGORIES }, (_, c) => {
            const count = categoryCounts[c] || 1;
            const catAvg = categoryClusterSums[c].map((s) => s / count);

            // Rank clusters by ratio to global average (over-representation).
            const ratios = catAvg.map((v, j) => ({ clusterId: j, ratio: v / (globalAvg[j] || 0.0001) }));
            ratios.sort((a, b) => b.ratio - a.ratio);

            const topClusters = ratios.slice(0, 5).map((r) => r.clusterId);
            const label = topClusters.slice(0, 3).map((id) => `Cluster ${id + 1}`).join(', ');

            // Round centroid values to 5 decimal places to keep output compact.
            const centroid = categoryCentroids[c].map((v) => Math.round(v * 100000) / 100000);

            return { id: c, memberCount: categoryCounts[c], topClusters, label, centroid };
        });

        // Sort categories by member count descending, reassign IDs.
        categoryDefs.sort((a, b) => b.memberCount - a.memberCount);
        categoryDefs.forEach((cat, i) => { cat.id = i; });

        const categoriesOutput = {
            numCategories: NUM_CUBE_CATEGORIES,
            clusterCount: numClusters,
            minCubeCards: MIN_CUBE_CARDS,
            cubeCount: cubeProfiles.length,
            categories: categoryDefs,
        };

        fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categoriesOutput));
        const catFileSizeKB = Math.round(fs.statSync(CATEGORIES_FILE).size / 1024);
        console.log(`  Wrote ${CATEGORIES_FILE} (${catFileSizeKB} KB)`);

        console.log('\nCube categories:');
        for (const cat of categoryDefs) {
            console.log(`  [${cat.memberCount} cubes] ${cat.label}`);
        }
    }
}

console.timeEnd('cube-categories');

// ---------------------------------------------------------------------------
// Step 8: Tag-based cube classification
// ---------------------------------------------------------------------------
// Represent each cube as a normalized tag-frequency vector: for every card,
// expand it to its Scryfall Tagger tags, accumulate counts, then normalize by
// total (card, tag) pairs. This makes the vector comparable across cubes of
// different sizes and different per-card tag densities.
//
// Unlike Step 7 (cluster-based), this method captures human-curated strategic
// themes (removal, ramp, recursion, etc.) rather than encoder-learned geometry.
// Lands ARE included — fetch-land, dual-land, basic etc. carry real signal.
//
// The tag vocabulary is embedded in the output file so the browser can
// reconstruct profiles at runtime without re-running this script.
// ---------------------------------------------------------------------------

console.log('\nStep 8: Classifying cubes by tag profile ...');
console.time('tag-categories');

if (!fs.existsSync(CUBES_JSONL) || !fs.existsSync(INDEX_TO_ORACLE)) {
    console.log('  Skipping tag classification — cubes.jsonl or indexToOracleMap.json not found.');
} else {
    // Build tag vocabulary from the full Scryfall card pool (including lands).
    const tagCardCounts = new Map<string, number>();
    for (const oracleId of Object.keys(cardsMinimized.cards)) {
        const card = cardsMinimized.cards[oracleId];
        if (!card?.tags) continue;
        for (const tag of card.tags as string[]) {
            tagCardCounts.set(tag, (tagCardCounts.get(tag) ?? 0) + 1);
        }
    }

    // Keep only tags on >= MIN_TAG_CARD_COUNT cards; sort descending for determinism.
    const tagVocabulary: string[] = Array.from(tagCardCounts.entries())
        .filter(([, count]) => count >= MIN_TAG_CARD_COUNT)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

    const tagToIdx = new Map<string, number>(tagVocabulary.map((tag, i) => [tag, i]));
    const tagVocabSize = tagVocabulary.length;
    console.log(`  Tag vocabulary: ${tagVocabSize} tags (${tagCardCounts.size} total in tagger data, min ${MIN_TAG_CARD_COUNT} cards)`);

    const indexToOracle2: Record<string, string> = JSON.parse(fs.readFileSync(INDEX_TO_ORACLE, 'utf8'));
    const tagCubeProfiles: number[][] = [];
    let tagSkippedSmall = 0, tagSkippedNoTags = 0;

    const cubeLines2 = fs.readFileSync(CUBES_JSONL, 'utf8').split('\n');
    for (const line of cubeLines2) {
        if (!line.trim()) continue;
        let cube: { id: string; cards: number[]; card_count: number };
        try { cube = JSON.parse(line); } catch { continue; }

        if (cube.card_count < MIN_CUBE_CARDS) { tagSkippedSmall++; continue; }

        const tagProfile = new Array<number>(tagVocabSize).fill(0);
        let totalTagPairs = 0;

        for (const idx of cube.cards) {
            const oracleId = indexToOracle2[idx];
            if (!oracleId) continue;
            const card = cardsMinimized.cards[oracleId];
            if (!card?.tags) continue;
            for (const tag of card.tags as string[]) {
                const tagIdx = tagToIdx.get(tag);
                if (tagIdx !== undefined) {
                    tagProfile[tagIdx]++;
                    totalTagPairs++;
                }
            }
        }

        // Require a minimum density of tag coverage to filter cubes with sparse data.
        if (totalTagPairs < 50) { tagSkippedNoTags++; continue; }

        // Normalize by total (card, tag) pairs — comparable across cube sizes
        // and different per-card tag densities.
        for (let j = 0; j < tagVocabSize; j++) tagProfile[j] /= totalTagPairs;
        tagCubeProfiles.push(tagProfile);
    }

    console.log(`  Qualifying cubes: ${tagCubeProfiles.length} (skipped ${tagSkippedSmall} too small, ${tagSkippedNoTags} insufficient tags)`);

    if (tagCubeProfiles.length < NUM_CUBE_CATEGORIES) {
        console.log('  Not enough cubes for tag classification, skipping.');
    } else {
        const tagSampleSize = Math.min(CUBE_KMEANS_SAMPLE, tagCubeProfiles.length);
        const tagShuffled = [...tagCubeProfiles];
        let lcgSeed = 54321;
        for (let i = tagShuffled.length - 1; i > 0; i--) {
            lcgSeed = (lcgSeed * 1664525 + 1013904223) & 0x7fffffff;
            const j = lcgSeed % (i + 1);
            [tagShuffled[i], tagShuffled[j]] = [tagShuffled[j], tagShuffled[i]];
        }
        const tagSample = tagShuffled.slice(0, tagSampleSize);

        console.log(`  Running k-means on ${tagSample.length} cubes (k=${NUM_CUBE_CATEGORIES}, restarts=${CUBE_KMEANS_RESTARTS}) ...`);
        console.time('tag-kmeans');
        const tagCatResult = kmeans(tagSample, NUM_CUBE_CATEGORIES, {
            initialization: 'kmeans++',
            seed: 42,
            maxIterations: 100,
        });
        console.timeEnd('tag-kmeans');

        const tagCentroids = tagCatResult.centroids as number[][];

        // Assign all profiles to nearest centroid to get final category counts.
        const tagCatCounts = new Array<number>(NUM_CUBE_CATEGORIES).fill(0);
        const tagCatSums: number[][] = Array.from(
            { length: NUM_CUBE_CATEGORIES },
            () => new Array<number>(tagVocabSize).fill(0),
        );

        for (const profile of tagCubeProfiles) {
            let minDist = Infinity, nearest = 0;
            for (let c = 0; c < tagCentroids.length; c++) {
                let d = 0;
                for (let j = 0; j < tagVocabSize; j++) {
                    const diff = profile[j] - tagCentroids[c][j];
                    d += diff * diff;
                }
                if (d < minDist) { minDist = d; nearest = c; }
            }
            tagCatCounts[nearest]++;
            for (let j = 0; j < tagVocabSize; j++) tagCatSums[nearest][j] += profile[j];
        }

        // Compute global average tag weights across all qualifying cubes.
        const tagGlobalAvg = new Array<number>(tagVocabSize).fill(0);
        for (const profile of tagCubeProfiles) {
            for (let j = 0; j < tagVocabSize; j++) tagGlobalAvg[j] += profile[j];
        }
        for (let j = 0; j < tagVocabSize; j++) tagGlobalAvg[j] /= tagCubeProfiles.length;

        // Build category definitions labelled by most over-represented tags.
        interface TagCubeCategory {
            id: number;
            memberCount: number;
            topTags: string[];
            label: string;
            centroid: number[];
        }

        const tagCatDefs: TagCubeCategory[] = Array.from({ length: NUM_CUBE_CATEGORIES }, (_, c) => {
            const count = tagCatCounts[c] || 1;
            const catAvg = tagCatSums[c].map(s => s / count);

            const ratios = catAvg.map((v, j) => ({ tagIdx: j, ratio: v / (tagGlobalAvg[j] || 0.0001) }));
            ratios.sort((a, b) => b.ratio - a.ratio);

            const topTags = ratios.slice(0, 5).map(r => tagVocabulary[r.tagIdx]);
            const label = topTags.slice(0, 3).join(', ');
            const centroid = tagCentroids[c].map(v => Math.round(v * 100000) / 100000);

            return { id: c, memberCount: tagCatCounts[c], topTags, label, centroid };
        });

        tagCatDefs.sort((a, b) => b.memberCount - a.memberCount);
        tagCatDefs.forEach((cat, i) => { cat.id = i; });

        const tagCategoriesOutput = {
            numCategories: NUM_CUBE_CATEGORIES,
            tagVocabulary,
            minTagCardCount: MIN_TAG_CARD_COUNT,
            minCubeCards: MIN_CUBE_CARDS,
            cubeCount: tagCubeProfiles.length,
            categories: tagCatDefs,
        };

        fs.writeFileSync(TAG_CATEGORIES_FILE, JSON.stringify(tagCategoriesOutput));
        const tagFileSizeKB = Math.round(fs.statSync(TAG_CATEGORIES_FILE).size / 1024);
        console.log(`  Wrote ${TAG_CATEGORIES_FILE} (${tagFileSizeKB} KB)`);

        console.log('\nTag-based cube categories:');
        for (const cat of tagCatDefs) {
            console.log(`  [${cat.memberCount} cubes] ${cat.label}`);
        }
    }
}

console.timeEnd('tag-categories');

console.log('\nDone.');
