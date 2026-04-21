import fs from 'fs';
import readline from 'readline';
import axios from 'axios';

const S3_BASE = 'https://cubecobra-public.s3.us-east-2.amazonaws.com';
const EXPORT_DIR = './data/cubecobra-export';
const CUBES_JSON = `${EXPORT_DIR}/cubes.json`;
const CUBES_JSONL = `${EXPORT_DIR}/cubes.jsonl`;
const INDEX_MAP_JSON = `${EXPORT_DIR}/indexToOracleMap.json`;

const OUTPUT_CARD_FREQUENCY = './data/cubecobra-card-frequency.json';

const RECENCY_MONTHS = parseInt(process.env.RECENCY_MONTHS ?? '12', 10);

const isUpdate = process.argv[2] === '--update';

// ---------------------------------------------------------------------------
// Phase 1: Download
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
// Phase 2: Convert cubes.json → cubes.jsonl (stream-parse JSON array)
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
// Phase 3: Card frequency by category (single pass over JSONL)
// ---------------------------------------------------------------------------

console.log('Loading reference data ...');
console.time('reference-data');

const indexToOracle: Record<string, string> = JSON.parse(fs.readFileSync(INDEX_MAP_JSON, 'utf8'));
const cardsMinimized = JSON.parse(fs.readFileSync('./data/cards-minimized.json', 'utf8'));

// Build oracle → scryfall card lookup.
const scryfallCards: Record<string, { minRarity: string; effectiveTypes: string[] }> = {};
for (const [oracleId, card] of Object.entries(cardsMinimized.cards) as [string, any][]) {
    scryfallCards[oracleId] = {
        minRarity: card.minRarity ?? 'common',
        effectiveTypes: card.effectiveTypes ?? [],
    };
}

console.timeEnd('reference-data');

// ---------------------------------------------------------------------------
// Category detection (ported from CubeFunctions.ts assumedCategories)
// ---------------------------------------------------------------------------

const powerOracleIds = [
    '550c74d4-1fcb-406a-b02a-639a760a4380', // Ancestral Recall
    '5089ec1a-f881-4d55-af14-5d996171203b', // Black Lotus
    '376ee366-e082-402f-b4db-6592fcfcacd2', // Mox Emerald
    '0677f49e-f8bf-4349-af52-2ccde9287c2e', // Mox Jet
    '824597b8-c89a-47ec-8526-7efc6e24ef0e', // Mox Pearl
    'ed85fa82-e4fa-434b-92a8-36b6075708d1', // Mox Ruby
    'd5ed1233-df87-4b90-8918-13922ec95249', // Mox Sapphire
    'c823e687-6311-4c99-974b-fd77d204141a', // Timetwister
    'd0209d3f-3f7e-4fd5-bce5-10bce6f29c86', // Time Walk
];

const BROAD_GROUPS: Record<string, string[]> = {
    pauper: ['pauper', 'pauper+', 'pauper-ish', 'pauper+ish'],
    peasant: ['peasant', 'peasant+', 'peasant-ish', 'peasant+ish'],
};

type RarityCounts = { common: number; uncommon: number; rare: number; mythic: number; total: number };

function detectCubeCategories(oracleIds: string[]): string[] {
    const totalCards = oracleIds.length;
    const categories: string[] = [];

    const counts: { all: RarityCounts; nonLand: RarityCounts; land: RarityCounts } = {
        all:     { common: 0, uncommon: 0, rare: 0, mythic: 0, total: 0 },
        nonLand: { common: 0, uncommon: 0, rare: 0, mythic: 0, total: 0 },
        land:    { common: 0, uncommon: 0, rare: 0, mythic: 0, total: 0 },
    };

    for (const oid of oracleIds) {
        const card = scryfallCards[oid];
        const minRarity = (card?.minRarity ?? 'common') as keyof RarityCounts;
        const bucket = card?.effectiveTypes?.includes('Land') ? 'land' : 'nonLand';

        if (counts.all[minRarity] !== undefined) counts.all[minRarity]++;
        counts.all.total++;
        if (counts[bucket][minRarity] !== undefined) counts[bucket][minRarity]++;
        counts[bucket].total++;
    }

    if (counts.all.common === totalCards) {
        categories.push('pauper');
    } else if (counts.nonLand.common + counts.land.total === totalCards) {
        categories.push('pauper+');
    } else if (counts.nonLand.common >= counts.nonLand.total * 0.925 && counts.land.common === counts.land.total) {
        categories.push('pauper-ish');
    } else if (counts.nonLand.common >= counts.nonLand.total * 0.925) {
        categories.push('pauper+ish');
    } else if (counts.all.common + counts.all.uncommon === totalCards) {
        categories.push('peasant');
    } else if (counts.nonLand.common + counts.nonLand.uncommon + counts.land.total === totalCards) {
        categories.push('peasant+');
    } else if (counts.nonLand.common + counts.nonLand.uncommon >= counts.nonLand.total * 0.925 && counts.land.common + counts.land.uncommon === counts.land.total) {
        categories.push('peasant-ish');
    } else if (counts.nonLand.common + counts.nonLand.uncommon >= counts.nonLand.total * 0.925) {
        categories.push('peasant+ish');
    }

    if (oracleIds.some(oid => powerOracleIds.includes(oid))) {
        categories.push('powered');
    }

    if (counts.land.total >= totalCards * 0.28) {
        categories.push('desert');
    }

    return categories;
}

// ---------------------------------------------------------------------------
// Date cutoff
// ---------------------------------------------------------------------------

const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - RECENCY_MONTHS);
const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);
console.log(`Recency filter: ${RECENCY_MONTHS} months → cubes updated after ${cutoffDate.toISOString().slice(0, 10)}`);

// ---------------------------------------------------------------------------
// Process cubes
// ---------------------------------------------------------------------------

// Cube count per category (including 'total' and 'uncategorized').
const cubeCountMap: Record<string, number> = { total: 0, uncategorized: 0 };

// Per-card frequency: cardFreq[oracleId][category] = count of cubes containing the card.
const cardFreq: Record<string, Record<string, number>> = {};

let totalParsed = 0;
let skippedByDate = 0;

console.log('Processing cubes ...');
console.time('processing');

await new Promise<void>((resolve, reject) => {
    const rl = readline.createInterface({
        input: fs.createReadStream(CUBES_JSONL, { encoding: 'utf8' }),
        crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
        if (!line.trim()) return;
        let cube: { id: string; cards: number[]; card_count: number; date_last_updated: number };
        try {
            cube = JSON.parse(line);
        } catch {
            return; // skip malformed lines
        }

        totalParsed++;

        // Date filter: skip cubes not updated within the recency window.
        if (cube.date_last_updated != null && cube.date_last_updated < cutoffTimestamp) {
            skippedByDate++;
            return;
        }

        // Resolve card indexes → oracle IDs.
        const oracleIds: string[] = [];
        for (const idx of cube.cards) {
            const oid = indexToOracle[String(idx)];
            if (oid) oracleIds.push(oid);
        }

        // Detect categories for this cube.
        const categories = detectCubeCategories(oracleIds);

        cubeCountMap.total++;
        if (categories.length === 0) {
            cubeCountMap.uncategorized++;
        }
        for (const cat of categories) {
            cubeCountMap[cat] = (cubeCountMap[cat] ?? 0) + 1;
        }

        // Card frequency — count each oracle ID once per cube.
        const seen = new Set<string>();
        for (const oid of oracleIds) {
            if (seen.has(oid)) continue;
            seen.add(oid);

            if (!cardFreq[oid]) cardFreq[oid] = {};
            cardFreq[oid].total = (cardFreq[oid].total ?? 0) + 1;

            if (categories.length === 0) {
                cardFreq[oid].uncategorized = (cardFreq[oid].uncategorized ?? 0) + 1;
            }
            for (const cat of categories) {
                cardFreq[oid][cat] = (cardFreq[oid][cat] ?? 0) + 1;
            }
        }

        if (cubeCountMap.total % 25000 === 0) {
            console.log(`  ... ${cubeCountMap.total.toLocaleString()} cubes processed`);
        }
    });

    rl.on('close', resolve);
    rl.on('error', reject);
});

console.log(`Parsed ${totalParsed.toLocaleString()} cubes total.`);
console.log(`Skipped ${skippedByDate.toLocaleString()} cubes (last updated before ${cutoffDate.toISOString().slice(0, 10)}).`);
console.log(`Processed ${cubeCountMap.total.toLocaleString()} cubes within recency window.`);
console.timeEnd('processing');

// ---------------------------------------------------------------------------
// Output: Card frequency
// ---------------------------------------------------------------------------

console.log('Writing card frequency data ...');

const frequencyOutput = {
    generatedAt: new Date().toISOString().slice(0, 10),
    recencyMonths: RECENCY_MONTHS,
    cubeCount: cubeCountMap,
    broadGroups: BROAD_GROUPS,
    cards: cardFreq,
};

fs.writeFileSync(OUTPUT_CARD_FREQUENCY, JSON.stringify(frequencyOutput));
console.log(`Wrote ${OUTPUT_CARD_FREQUENCY} (${Object.keys(cardFreq).length.toLocaleString()} cards)`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n--- Summary ---');
console.log(`Total cubes (within ${RECENCY_MONTHS} months): ${cubeCountMap.total.toLocaleString()}`);
console.log('Cubes by category:', cubeCountMap);
console.log(`Unique cards seen: ${Object.keys(cardFreq).length.toLocaleString()}`);

console.log('\nDone.');
