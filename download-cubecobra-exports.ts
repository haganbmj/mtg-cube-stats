import fs from 'fs';
import readline from 'readline';
import axios from 'axios';

const S3_BASE = 'https://cubecobra-public.s3.us-east-2.amazonaws.com';
const EXPORT_DIR = './data/cubecobra-export';
const CUBES_JSON = `${EXPORT_DIR}/cubes.json`;
const CUBES_JSONL = `${EXPORT_DIR}/cubes.jsonl`;
const INDEX_MAP_JSON = `${EXPORT_DIR}/indexToOracleMap.json`;

const OUTPUT_CARD_FREQUENCY = './data/cubecobra-card-frequency.json';
const OUTPUT_TAG_ANALYSIS = './data/cubecobra-tag-analysis.json';
const OUTPUT_TAG_GRAPH = './data/cubecobra-tag-graph.json';

// Minimum number of Scryfall cards a tag must appear on to be included in co-occurrence analysis.
const TAG_MIN_CARD_COUNT = 100;
// Minimum number of cards with a tag in a single cube for that tag to count as "present".
const TAG_PRESENCE_THRESHOLD = 2;
// Number of top correlated tags to store per tag.
const TOP_CORRELATIONS = 15;

const isUpdate = process.argv[2] === '--update';

// ---------------------------------------------------------------------------
// Phase 1: Download & Convert
// ---------------------------------------------------------------------------

if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Download indexToOracleMap.json (small file, load into memory).
if (!fs.existsSync(INDEX_MAP_JSON) || isUpdate) {
    console.log('Downloading indexToOracleMap.json ...');
    const resp = await axios({
        url: `${S3_BASE}/export/indexToOracleMap.json`,
        method: 'GET',
        responseType: 'stream',
    });
    const write = fs.createWriteStream(INDEX_MAP_JSON);
    resp.data.pipe(write);
    await new Promise((res, rej) => {
        write.on('finish', res);
        write.on('error', rej);
    });
} else {
    console.log('Using existing indexToOracleMap.json.');
}

// Download cubes.json (large file, stream to disk).
if (!fs.existsSync(CUBES_JSON) || isUpdate) {
    console.log('Downloading cubes.json (this may take a while) ...');
    const resp = await axios({
        url: `${S3_BASE}/export/cubes.json`,
        method: 'GET',
        responseType: 'stream',
    });
    const write = fs.createWriteStream(CUBES_JSON);
    resp.data.pipe(write);
    await new Promise((res, rej) => {
        write.on('finish', res);
        write.on('error', rej);
    });
} else {
    console.log('Using existing cubes.json.');
}

// ---------------------------------------------------------------------------
// Phase 1b: Convert cubes.json → cubes.jsonl (stream-parse JSON array)
// ---------------------------------------------------------------------------

// cubes.json is a large JSON array [ {...}, {...}, ... ]. We stream-parse it into
// one JSON object per line to avoid loading the entire array into memory.
// The structure is flat — each element is a shallow object whose only array field
// is `cards` (numbers). We track brace depth to find element boundaries.

if (!fs.existsSync(CUBES_JSONL) || isUpdate) {
    console.log('Converting cubes.json → cubes.jsonl ...');
    console.time('jsonl-conversion');

    let cubeCount = 0;
    await new Promise<void>((resolve, reject) => {
        const input = fs.createReadStream(CUBES_JSON, { encoding: 'utf8', highWaterMark: 256 * 1024 });
        const output = fs.createWriteStream(CUBES_JSONL);

        let depth = 0;       // brace depth (0 = outside any object)
        let inString = false;
        let escaped = false;
        let buffer = '';      // accumulates characters for the current object

        input.on('data', (chunk: string) => {
            for (let i = 0; i < chunk.length; i++) {
                const ch = chunk[i];

                if (escaped) {
                    if (depth > 0) buffer += ch;
                    escaped = false;
                    continue;
                }

                if (ch === '\\' && inString) {
                    if (depth > 0) buffer += ch;
                    escaped = true;
                    continue;
                }

                if (ch === '"') {
                    inString = !inString;
                    if (depth > 0) buffer += ch;
                    continue;
                }

                if (inString) {
                    if (depth > 0) buffer += ch;
                    continue;
                }

                // Outside of strings, track braces.
                if (ch === '{') {
                    depth++;
                    buffer += ch;
                    continue;
                }

                if (ch === '}') {
                    depth--;
                    buffer += ch;
                    if (depth === 0 && buffer.length > 0) {
                        // Completed one cube object — strip the `following` array to reduce file size.
                        const obj = JSON.parse(buffer);
                        delete obj.following;
                        output.write(JSON.stringify(obj) + '\n');
                        cubeCount++;
                        buffer = '';
                        if (cubeCount % 25000 === 0) {
                            console.log(`  ... ${cubeCount.toLocaleString()} cubes converted`);
                        }
                    }
                    continue;
                }

                if (depth > 0) {
                    buffer += ch;
                }
            }
        });

        input.on('end', () => {
            output.end();
            console.log(`Converted ${cubeCount.toLocaleString()} cubes to JSONL.`);
            console.timeEnd('jsonl-conversion');
            resolve();
        });

        input.on('error', reject);
        output.on('error', reject);
    });
} else {
    console.log('Using existing cubes.jsonl.');
}

// ---------------------------------------------------------------------------
// Phase 2 & 3: Card frequency + Tag co-occurrence (single pass over JSONL)
// ---------------------------------------------------------------------------

console.log('Loading reference data ...');
console.time('reference-data');

const indexToOracle: Record<string, string> = JSON.parse(fs.readFileSync(INDEX_MAP_JSON, 'utf8'));
const cardsMinimized = JSON.parse(fs.readFileSync('./data/cards-minimized.json', 'utf8'));

// Build oracle → tags lookup from cards-minimized.json.
const oracleToTags: Record<string, string[]> = {};
for (const [oracleId, card] of Object.entries(cardsMinimized.cards) as [string, any][]) {
    oracleToTags[oracleId] = card.tags ?? [];
}

// Determine which tags qualify for co-occurrence analysis (appear on ≥ TAG_MIN_CARD_COUNT cards).
const tagCardCount: Record<string, number> = {};
for (const tags of Object.values(oracleToTags)) {
    for (const tag of tags) {
        tagCardCount[tag] = (tagCardCount[tag] ?? 0) + 1;
    }
}
const qualifiedTags = new Set(
    Object.entries(tagCardCount)
        .filter(([, count]) => count >= TAG_MIN_CARD_COUNT)
        .map(([tag]) => tag),
);

// ---------------------------------------------------------------------------
// Tag Family Detection
// ---------------------------------------------------------------------------
// Tags that appear on the exact same set of oracle IDs are synonyms. We detect
// this by hashing each tag's oracle ID set and grouping tags with identical hashes.
// Within each family, the shortest tag name is chosen as the representative.

console.time('tag-families');

// Build tag → sorted oracle ID set signature (hash of sorted oracle IDs).
const tagToOracleSet: Record<string, string[]> = {};
for (const [oracleId, tags] of Object.entries(oracleToTags)) {
    for (const tag of tags) {
        if (!qualifiedTags.has(tag)) continue;
        if (!tagToOracleSet[tag]) tagToOracleSet[tag] = [];
        tagToOracleSet[tag].push(oracleId);
    }
}

// Hash each tag's oracle set for grouping. We use a simple string hash of sorted oracle IDs.
const tagToHash: Record<string, string> = {};
for (const [tag, oracleIds] of Object.entries(tagToOracleSet)) {
    oracleIds.sort();
    // Use first 3 + last 3 oracle IDs + length as a fast fingerprint.
    // Tags with identical card sets will always have identical fingerprints.
    const fp = `${oracleIds.length}:${oracleIds.slice(0, 3).join(',')}:${oracleIds.slice(-3).join(',')}`;
    tagToHash[tag] = fp;
}

// Group by fingerprint, then verify exact equality for groups.
const hashToTags: Record<string, string[]> = {};
for (const [tag, hash] of Object.entries(tagToHash)) {
    if (!hashToTags[hash]) hashToTags[hash] = [];
    hashToTags[hash].push(tag);
}

// For groups with multiple tags sharing the same fingerprint, verify they truly share
// the same oracle set, then pick the shortest name as representative.
const tagToFamily: Record<string, string> = {};  // tag → family representative
const familyMembers: Record<string, string[]> = {};  // representative → all member tags

for (const group of Object.values(hashToTags)) {
    if (group.length === 1) {
        // Singleton — its own family.
        tagToFamily[group[0]] = group[0];
        familyMembers[group[0]] = [group[0]];
        continue;
    }

    // Verify exact oracle set match within the group by comparing full sorted arrays.
    const subGroups: string[][] = [];
    for (const tag of group) {
        let matched = false;
        for (const sg of subGroups) {
            const a = tagToOracleSet[tag];
            const b = tagToOracleSet[sg[0]];
            if (a.length === b.length && a.every((v, i) => v === b[i])) {
                sg.push(tag);
                matched = true;
                break;
            }
        }
        if (!matched) subGroups.push([tag]);
    }

    for (const sg of subGroups) {
        // Pick shortest tag name as the representative (break ties alphabetically).
        sg.sort((a, b) => a.length - b.length || a.localeCompare(b));
        const representative = sg[0];
        for (const tag of sg) {
            tagToFamily[tag] = representative;
        }
        familyMembers[representative] = sg;
    }
}

// Build the deduplicated tag list — only family representatives participate in co-occurrence.
const representativeTags = new Set(Object.values(tagToFamily));
const qualifiedTagList = [...representativeTags].filter(t => qualifiedTags.has(t)).sort();
const tagIndex = new Map(qualifiedTagList.map((tag, i) => [tag, i]));
const numTags = qualifiedTagList.length;

const totalFamilies = Object.keys(familyMembers).length;
const collapsedFamilies = Object.values(familyMembers).filter(m => m.length > 1);
console.log(`Tag families: ${totalFamilies} families from ${qualifiedTags.size} qualified tags (${collapsedFamilies.length} multi-member families collapsed)`);
if (collapsedFamilies.length > 0) {
    // Show a few example families.
    const examples = collapsedFamilies
        .sort((a, b) => b.length - a.length)
        .slice(0, 10);
    for (const fam of examples) {
        console.log(`  ${fam[0]} ← [${fam.slice(1).join(', ')}]`);
    }
}
console.log(`Deduplicated tags for co-occurrence: ${numTags}`);
console.timeEnd('tag-families');
console.timeEnd('reference-data');

// Size buckets for card frequency.
const SIZE_BUCKETS = [180, 270, 360, 450, 540, 720] as const;
type BucketKey = typeof SIZE_BUCKETS[number] | 'other';
function toBucket(cardCount: number): BucketKey {
    // Assign to nearest bucket within ±10%, otherwise 'other'.
    for (const b of SIZE_BUCKETS) {
        if (Math.abs(cardCount - b) / b <= 0.1) return b;
    }
    return 'other';
}

// Accumulators
const totalCubesByBucket: Record<BucketKey, number> = { 180: 0, 270: 0, 360: 0, 450: 0, 540: 0, 720: 0, other: 0 };
let totalCubes = 0;

// Per-card frequency: cardFreq[oracleId][bucket] = count
const cardFreq: Record<string, Record<string, number>> = {};

// Per-tag stats: running sums for mean/variance calculation (Welford's algorithm).
const tagCubeCount = new Float64Array(numTags);     // cubes where tag is "present" (≥ threshold cards)
const tagSum = new Float64Array(numTags);            // sum of tag counts across cubes
const tagSumSq = new Float64Array(numTags);          // sum of squared tag counts

// Per-tag inclusion rate stats: tagCount / uniqueCardCount per cube (size-normalized).
const tagRateSum = new Float64Array(numTags);        // sum of inclusion rates across cubes
const tagRateSumSq = new Float64Array(numTags);      // sum of squared inclusion rates

// Tag-tag co-occurrence: number of cubes where BOTH tags are present.
// Stored as flat upper-triangle of numTags × numTags matrix.
// cooccurrence[i * numTags + j] for i < j.
const cooccurrence = new Float64Array(numTags * numTags);

console.log('Processing cubes ...');
console.time('processing');

await new Promise<void>((resolve, reject) => {
    const rl = readline.createInterface({
        input: fs.createReadStream(CUBES_JSONL, { encoding: 'utf8' }),
        crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
        if (!line.trim()) return;
        let cube: { id: string; cards: number[]; card_count: number; following: number };
        try {
            cube = JSON.parse(line);
        } catch {
            return; // skip malformed lines
        }

        const bucket = toBucket(cube.card_count);
        totalCubesByBucket[bucket]++;
        totalCubes++;

        // Resolve card indexes → oracle IDs.
        const oracleIds: string[] = [];
        for (const idx of cube.cards) {
            const oid = indexToOracle[String(idx)];
            if (oid) oracleIds.push(oid);
        }

        // --- Card frequency ---
        const seen = new Set<string>();
        for (const oid of oracleIds) {
            if (seen.has(oid)) continue; // count each card once per cube
            seen.add(oid);
            if (!cardFreq[oid]) cardFreq[oid] = {};
            cardFreq[oid]['total'] = (cardFreq[oid]['total'] ?? 0) + 1;
            cardFreq[oid][bucket] = (cardFreq[oid][bucket] ?? 0) + 1;
        }

        // --- Tag profile for this cube (using family representatives) ---
        // Count each family at most once per oracle ID to get proper inclusion counts.
        // Iterate over unique oracle IDs only (same dedup as card frequency).
        const tagCounts = new Float64Array(numTags); // count of unique cards per qualified tag family
        for (const oid of seen) {
            const tags = oracleToTags[oid];
            if (!tags) continue;
            const seenFamilies = new Set<number>();
            for (const tag of tags) {
                const family = tagToFamily[tag];
                if (family === undefined) continue;
                const ti = tagIndex.get(family);
                if (ti !== undefined && !seenFamilies.has(ti)) {
                    seenFamilies.add(ti);
                    tagCounts[ti]++;
                }
            }
        }

        // Update tag stats + co-occurrence.
        const uniqueCardCount = seen.size; // unique cards in this cube
        const presentTags: number[] = []; // indices of tags "present" in this cube
        for (let t = 0; t < numTags; t++) {
            if (tagCounts[t] > 0) {
                tagSum[t] += tagCounts[t];
                tagSumSq[t] += tagCounts[t] * tagCounts[t];
                // Inclusion rate: fraction of this cube's unique cards that carry this tag.
                const rate = uniqueCardCount > 0 ? tagCounts[t] / uniqueCardCount : 0;
                tagRateSum[t] += rate;
                tagRateSumSq[t] += rate * rate;
            }
            if (tagCounts[t] >= TAG_PRESENCE_THRESHOLD) {
                tagCubeCount[t]++;
                presentTags.push(t);
            }
        }

        // Increment co-occurrence for all present tag pairs.
        for (let a = 0; a < presentTags.length; a++) {
            const ti = presentTags[a];
            for (let b = a + 1; b < presentTags.length; b++) {
                const tj = presentTags[b];
                cooccurrence[ti * numTags + tj]++;
            }
        }

        if (totalCubes % 25000 === 0) {
            console.log(`  ... ${totalCubes.toLocaleString()} cubes processed`);
        }
    });

    rl.on('close', resolve);
    rl.on('error', reject);
});

console.log(`Processed ${totalCubes.toLocaleString()} cubes total.`);
console.timeEnd('processing');

// ---------------------------------------------------------------------------
// Output: Card frequency
// ---------------------------------------------------------------------------

console.log('Writing card frequency data ...');
const cardFreqOutput: Record<string, any> = {
    totalCubes,
    cubesByBucket: totalCubesByBucket,
    cards: cardFreq,
};
fs.writeFileSync(OUTPUT_CARD_FREQUENCY, JSON.stringify(cardFreqOutput));
console.log(`Wrote ${OUTPUT_CARD_FREQUENCY} (${Object.keys(cardFreq).length.toLocaleString()} cards)`);

// ---------------------------------------------------------------------------
// Compute: Tag analysis (PMI, variance, top correlations)
// ---------------------------------------------------------------------------

console.log('Computing tag analysis ...');
console.time('tag-analysis');

interface TagCorrelation {
    tag: string;
    pmi: number;
    cooccurrenceCount: number;
}

interface TagStats {
    cubeCount: number;
    meanCount: number;
    variance: number;
    topCorrelations: TagCorrelation[];
}

const tagAnalysis: Record<string, TagStats> = {};

for (let i = 0; i < numTags; i++) {
    const tag = qualifiedTagList[i];
    const n = totalCubes;
    const mean = tagSum[i] / n;
    const variance = (tagSumSq[i] / n) - (mean * mean);

    // Collect PMI with all other tags.
    const correlations: TagCorrelation[] = [];
    const pI = tagCubeCount[i] / n;
    if (pI === 0) {
        tagAnalysis[tag] = { cubeCount: 0, meanCount: mean, variance, topCorrelations: [] };
        continue;
    }

    for (let j = 0; j < numTags; j++) {
        if (i === j) continue;
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        const coCount = cooccurrence[lo * numTags + hi];
        if (coCount === 0) continue;

        const pJ = tagCubeCount[j] / n;
        if (pJ === 0) continue;

        const pIJ = coCount / n;
        const pmi = Math.log2(pIJ / (pI * pJ));

        correlations.push({ tag: qualifiedTagList[j], pmi: Math.round(pmi * 1000) / 1000, cooccurrenceCount: coCount });
    }

    // Sort by PMI descending, take top N.
    correlations.sort((a, b) => b.pmi - a.pmi);
    const topCorrelations = correlations.slice(0, TOP_CORRELATIONS);

    tagAnalysis[tag] = {
        cubeCount: tagCubeCount[i],
        meanCount: Math.round(mean * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        topCorrelations,
    };
}

// ---------------------------------------------------------------------------
// Output: Tag analysis
// ---------------------------------------------------------------------------

const tagAnalysisOutput = {
    totalCubes,
    tagPresenceThreshold: TAG_PRESENCE_THRESHOLD,
    tagMinCardCount: TAG_MIN_CARD_COUNT,
    qualifiedTagCount: numTags,
    tagFamilies: Object.fromEntries(
        Object.entries(familyMembers)
            .filter(([, members]) => members.length > 1)
            .map(([rep, members]) => [rep, members.filter(m => m !== rep)]),
    ),
    tags: tagAnalysis,
};

fs.writeFileSync(OUTPUT_TAG_ANALYSIS, JSON.stringify(tagAnalysisOutput));
console.log(`Wrote ${OUTPUT_TAG_ANALYSIS} (${numTags} tags)`);
console.timeEnd('tag-analysis');

// ---------------------------------------------------------------------------
// Phase 4: Tag Graph (compact output for chart consumption)
// ---------------------------------------------------------------------------
// Emits a compact file with tag-pair PMI values, tag family mappings, and
// per-tag metadata. The TagSynergyChart loads this at runtime to add tag-tag
// edges and map synonymous tags to family representatives.
// Uses the already-computed topCorrelations from Phase 3 rather than re-scanning
// all pairs, keeping the output compact (~300KB vs ~6MB for all qualifying pairs).

console.log('Building tag graph for chart consumption ...');
console.time('tag-graph');

// Extract deduplicated tag pairs from the per-tag topCorrelations.
const tagPairMap = new Map<string, [string, string, number, number]>();
for (const [tag, stats] of Object.entries(tagAnalysis)) {
    for (const corr of stats.topCorrelations) {
        const [a, b] = tag < corr.tag ? [tag, corr.tag] : [corr.tag, tag];
        const key = `${a}|${b}`;
        if (!tagPairMap.has(key)) {
            tagPairMap.set(key, [a, b, corr.pmi, corr.cooccurrenceCount]);
        }
    }
}

const tagPairs = Array.from(tagPairMap.values());
tagPairs.sort((a, b) => b[2] - a[2]);

// Build tagFamilyMap: raw tag → family representative (non-identity mappings only).
const tagFamilyMapOutput: Record<string, string> = {};
for (const [tag, rep] of Object.entries(tagToFamily)) {
    if (tag !== rep) {
        tagFamilyMapOutput[tag] = rep;
    }
}

// Build compact tagMeta: [cubeCount, variance, meanCount, meanRate, rateStdDev] per family representative.
// meanRate = average inclusion rate (tagCount / uniqueCards) across cubes where tag appears.
// rateStdDev = standard deviation of that rate. Chart uses these for z-score computation.
const tagMetaOutput: Record<string, [number, number, number, number, number]> = {};
for (const [tag, stats] of Object.entries(tagAnalysis)) {
    const i = tagIndex.get(tag)!;
    // Rate stats are computed across cubes where the tag has any cards (tagSum > 0 implies we accumulated).
    // cubeCount here is cubes where tag >= threshold, but rate sums include all cubes with any cards of this tag.
    // For rate mean/stddev, use the number of cubes that contributed (those where tagCounts[t] > 0).
    // We can approximate with tagCubeCount since cubes below threshold have negligible rates.
    const n = tagCubeCount[i];
    const meanRate = n > 0 ? tagRateSum[i] / n : 0;
    const rateVariance = n > 0 ? (tagRateSumSq[i] / n) - (meanRate * meanRate) : 0;
    const rateStdDev = Math.sqrt(Math.max(0, rateVariance));

    tagMetaOutput[tag] = [
        stats.cubeCount,
        Math.round(stats.variance * 100) / 100,
        Math.round(stats.meanCount * 100) / 100,
        Math.round(meanRate * 10000) / 10000,
        Math.round(rateStdDev * 10000) / 10000,
    ];
}

const tagGraphOutput = {
    totalCubes,
    tagFamilyMap: tagFamilyMapOutput,
    tagPairs,
    tagMeta: tagMetaOutput,
};

fs.writeFileSync(OUTPUT_TAG_GRAPH, JSON.stringify(tagGraphOutput));
console.log(`Wrote ${OUTPUT_TAG_GRAPH} (${tagPairs.length} tag pairs, ${Object.keys(tagFamilyMapOutput).length} family mappings)`);
console.timeEnd('tag-graph');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n--- Summary ---');
console.log(`Total cubes: ${totalCubes.toLocaleString()}`);
console.log('Cubes by size bucket:', totalCubesByBucket);
console.log(`Unique cards seen: ${Object.keys(cardFreq).length.toLocaleString()}`);
console.log(`Tag families: ${numTags} (collapsed from ${qualifiedTags.size} qualified tags)`);

// Top 10 highest-variance tags.
const sortedByVariance = Object.entries(tagAnalysis)
    .filter(([, s]) => s.cubeCount >= 100)
    .sort(([, a], [, b]) => b.variance - a.variance);
console.log('\nTop 10 highest-variance tags (differentiating):');
for (const [tag, stats] of sortedByVariance.slice(0, 10)) {
    console.log(`  ${tag}: variance=${stats.variance}, mean=${stats.meanCount}, cubes=${stats.cubeCount}`);
}

// Top 10 highest-PMI tag pairs (sample from first tag's correlations with high co-occurrence).
console.log('\nSample high-PMI tag pairs:');
const interestingPairs: { tagA: string; tagB: string; pmi: number; cooccurrenceCount: number }[] = [];
for (const [tag, stats] of Object.entries(tagAnalysis)) {
    for (const corr of stats.topCorrelations) {
        if (corr.cooccurrenceCount >= 100) {
            interestingPairs.push({ tagA: tag, tagB: corr.tag, pmi: corr.pmi, cooccurrenceCount: corr.cooccurrenceCount });
        }
    }
}
interestingPairs.sort((a, b) => b.pmi - a.pmi);
for (const pair of interestingPairs.slice(0, 15)) {
    console.log(`  ${pair.tagA} ↔ ${pair.tagB}: PMI=${pair.pmi}, co-occurrence=${pair.cooccurrenceCount}`);
}

console.log('\nDone.');
