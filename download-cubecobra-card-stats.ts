import fs from 'fs';
import axios from 'axios';

const OUTPUT_FILE = './data/cubecobra-card-stats.json';
const PROGRESS_FILE = './data/.cubecobra-card-stats-progress.json';
const PARTIAL_FILE = './data/.cubecobra-card-stats-partial.jsonl';
const DELAY_MS = 1500;
const BASE_URL = 'https://cubecobra.com/tool/api/searchcards/';

const refresh = process.env.REFRESH_COBRA_CARDS || 'false';

// Staleness check: skip if output exists and no refresh requested
if (fs.existsSync(OUTPUT_FILE) && process.argv[2] !== '--update' && refresh.toLowerCase() !== 'true') {
  console.log('Using existing CubeCobra card stats.');
  process.exit(0);
}

console.log('Fetching CubeCobra card stats...');

// Progress checkpoint interface
interface ProgressCheckpoint {
  lastPage: number;
  totalPages: number;
  pageSize: number;
}

function loadProgress(): ProgressCheckpoint | null {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return null;
}

function saveProgress(checkpoint: ProgressCheckpoint): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(checkpoint));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(page: number): Promise<{ data: any[]; numResults: number }> {
  const resp = await axios.get(BASE_URL, {
    params: { p: page, f: '', s: 'Alphabetical', d: 'ascending', di: 'names' },
    headers: { 'User-Agent': 'mtg-cube-stats/0.1.0' },
    timeout: 30000,
  });
  if (resp.data?.success !== 'true' || !Array.isArray(resp.data.data)) {
    throw new Error(`Unexpected response on page ${page}: ${JSON.stringify(resp.data).slice(0, 200)}`);
  }
  return { data: resp.data.data, numResults: resp.data.numResults };
}

// Main pagination loop
const progress = loadProgress();
let startPage = 0;
let totalPages = 0;
let pageSize = 0;

if (progress) {
  startPage = progress.lastPage + 1;
  totalPages = progress.totalPages;
  pageSize = progress.pageSize;
  console.log(`Resuming from page ${startPage} / ${totalPages}`);
} else {
  const first = await fetchPage(0);
  pageSize = first.data.length;
  totalPages = Math.ceil(first.numResults / pageSize);
  console.log(`Total: ${first.numResults} cards across ${totalPages} pages (${pageSize} per page)`);

  fs.writeFileSync(PARTIAL_FILE, JSON.stringify(first.data) + '\n');
  saveProgress({ lastPage: 0, totalPages, pageSize });
  startPage = 1;
}

for (let page = startPage; page < totalPages; page++) {
  await sleep(DELAY_MS);
  try {
    const result = await fetchPage(page);
    fs.appendFileSync(PARTIAL_FILE, JSON.stringify(result.data) + '\n');
    saveProgress({ lastPage: page, totalPages, pageSize });
    if (page % 25 === 0 || page === totalPages - 1) {
      console.log(`  Page ${page + 1} / ${totalPages}`);
    }
  } catch (err: any) {
    console.error(`Failed on page ${page}: ${err.message}`);
    console.error('Progress saved. Re-run to resume.');
    process.exit(1);
  }
}

// Deduplicate and write final output
console.log('Processing results...');

const allCards: any[] = [];
const lines = fs.readFileSync(PARTIAL_FILE, 'utf-8').trim().split('\n');
for (const line of lines) {
  allCards.push(...JSON.parse(line));
}

const stats: Record<string, { elo: number; popularity: number; cubeCount: number; pickCount: number }> = {};
for (const card of allCards) {
  const oracleId = card.oracle_id;
  if (!oracleId || stats[oracleId]) continue;
  stats[oracleId] = {
    elo: card.elo ?? 1200,
    popularity: card.popularity ?? 0,
    cubeCount: card.cubeCount ?? 0,
    pickCount: card.pickCount ?? 0,
  };
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats));
console.log(`Wrote ${Object.keys(stats).length} cards to ${OUTPUT_FILE}`);

// Clean up checkpoint files
fs.unlinkSync(PROGRESS_FILE);
fs.unlinkSync(PARTIAL_FILE);
console.log('Done.');
