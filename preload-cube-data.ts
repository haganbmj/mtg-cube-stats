import fs from 'fs';
import path from 'path';
import { remapCube, computeSimilarityMatrix } from './src/util/CubeFunctions';
import { getCubeData, fetchTopCubeIds } from './src/util/CubeCobra';
import type { Cube } from './src/types';
import type { PresetCollection } from './src/types/presets';

// --- Configuration ---

const isCI = process.env.CI === 'true';
const refresh = process.env.REFRESH_PRELOADS === 'true';
const shardIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

const MANIFESTS_DIR = './preloads/manifests';
const CACHE_CUBES_DIR = './preloads/cache/cubes';
const GENERATED_DIR = './preloads/generated';
const GENERATED_CUBES_DIR = './preloads/generated/cubes';
const GENERATED_SIMILARITIES_DIR = './preloads/generated/similarities';
const TOP100_IDS_PATH = './preloads/cache/cubecobra-top100-ids.json';

// --- CLI flags ---

const args = process.argv.slice(2);
const fetchOnly = args.includes('--fetch-only');
const assembleOnly = args.includes('--assemble-only');

// --- Types ---

interface ManifestFetch {
    staleThreshold: string;
    shardCount: number;
    source?: string;
}

interface Manifest {
    name: string;
    label: string;
    description?: string;
    icon?: string | null;
    links?: Array<{ label: string; url: string; type?: string }>;
    fetch: ManifestFetch | null;
    cubes: string[];
}

// --- Helpers ---

function parseThreshold(threshold: string): number {
    const match = threshold.match(/^(\d+)([dhm])$/);
    if (!match) throw new Error(`Invalid staleThreshold format: "${threshold}"`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        default: throw new Error(`Unknown unit: ${unit}`);
    }
}

function isStale(filePath: string, thresholdMs: number): boolean {
    if (!fs.existsSync(filePath)) return true;
    const stats = fs.statSync(filePath);
    if (stats.size === 0) return true;
    return (Date.now() - stats.mtimeMs) > thresholdMs;
}

function loadManifests(): Manifest[] {
    const files = fs.readdirSync(MANIFESTS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => {
        const content = fs.readFileSync(path.join(MANIFESTS_DIR, f), 'utf-8');
        return JSON.parse(content) as Manifest;
    });
}

// --- Ensure directories exist ---

function ensureDirectories() {
    fs.mkdirSync(CACHE_CUBES_DIR, { recursive: true });
    fs.mkdirSync(GENERATED_CUBES_DIR, { recursive: true });
    fs.mkdirSync(GENERATED_SIMILARITIES_DIR, { recursive: true });
}

// --- Resolve dynamic cube lists ---

async function resolveManifestCubes(manifest: Manifest): Promise<string[]> {
    if (manifest.fetch?.source === 'cubecobra-top100') {
        return await resolveTop100Ids();
    }
    return manifest.cubes;
}

async function resolveTop100Ids(): Promise<string[]> {
    const staleMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (!isStale(TOP100_IDS_PATH, staleMs)) {
        const ids: string[] = JSON.parse(fs.readFileSync(TOP100_IDS_PATH, 'utf-8'));
        console.log(`[cubecobra-top100] Using cached ID list (${ids.length} cubes).`);
        return ids;
    }

    console.log('[cubecobra-top100] ID list is missing or stale — fetching from CubeCobra...');
    try {
        const ids = await fetchTopCubeIds(100);
        fs.writeFileSync(TOP100_IDS_PATH, JSON.stringify(ids, null, 2));
        console.log(`[cubecobra-top100] Fetched ${ids.length} cube IDs.`);
        return ids;
    } catch (e: any) {
        console.error(`[cubecobra-top100] Failed to fetch ID list: ${e.message}`);
        // Fall back to cached if it exists (even if stale)
        if (fs.existsSync(TOP100_IDS_PATH)) {
            const ids: string[] = JSON.parse(fs.readFileSync(TOP100_IDS_PATH, 'utf-8'));
            console.log(`[cubecobra-top100] Falling back to stale cached list (${ids.length} cubes).`);
            return ids;
        }
        return [];
    }
}

// --- Phase 1: Fetch ---

async function phaseFetch(manifests: Manifest[]) {
    console.log('\n=== Phase 1: Fetch ===\n');

    for (const manifest of manifests) {
        const cubeIds = await resolveManifestCubes(manifest);
        if (cubeIds.length === 0) {
            console.log(`[${manifest.name}] No cubes to fetch, skipping.`);
            continue;
        }

        console.group(`[${manifest.name}] Fetching ${cubeIds.length} cubes...`);

        for (const [index, cubeId] of cubeIds.entries()) {
            const cachePath = path.join(CACHE_CUBES_DIR, `${cubeId}.json`);

            // Determine if we should skip this cube
            if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 0) {
                const fileAge = Date.now() - fs.statSync(cachePath).mtimeMs;

                // Static manifests (fetch: null): never re-fetch once cached
                if (manifest.fetch === null) {
                    console.log(`[${cubeId}] Static manifest, using cache.`);
                    continue;
                }

                const thresholdMs = parseThreshold(manifest.fetch.staleThreshold);

                // CI without REFRESH_PRELOADS: skip all fetches
                if (isCI && !refresh) {
                    console.log(`[${cubeId}] Skipping due to refresh policy.`);
                    continue;
                }

                // CI sharding: spread fetches across days
                if (
                    isCI
                    && manifest.fetch.shardCount > 0
                    && index % manifest.fetch.shardCount !== shardIndex % manifest.fetch.shardCount
                    && fileAge <= 28 * 24 * 60 * 60 * 1000
                ) {
                    console.log(`[${cubeId}] Skipping due to sharding policy.`);
                    continue;
                }

                // File is still fresh
                if (fileAge <= thresholdMs) {
                    console.log(`[${cubeId}] Cache is fresh, skipping.`);
                    continue;
                }

                console.log(`[${cubeId}] Cache is stale, re-fetching...`);
            } else {
                // File doesn't exist or is empty
                if (manifest.fetch === null) {
                    console.log(`[${cubeId}] Static manifest, fetching for first time...`);
                } else {
                    console.log(`[${cubeId}] Not cached, fetching...`);
                }
            }

            try {
                const cube = await getCubeData(cubeId);
                fs.writeFileSync(cachePath, JSON.stringify(cube));
            } catch (e: any) {
                console.error(`[${cubeId}] Failed to fetch: ${e.message}`);
            }
        }

        console.groupEnd();
    }
}

// --- Phase 2: Assemble ---

async function phaseAssemble(manifests: Manifest[]) {
    console.log('\n=== Phase 2: Assemble ===\n');

    const presets: PresetCollection[] = [];

    for (const manifest of manifests) {
        const cubeIds = await resolveManifestCubes(manifest);
        if (cubeIds.length === 0) {
            console.log(`[${manifest.name}] No cubes, skipping assembly.`);
            continue;
        }

        console.group(`[${manifest.name}] Assembling ${cubeIds.length} cubes...`);

        const remappedCubes: Record<string, Cube> = {};
        const cubeEntries: Record<string, { fetchedAt: string }> = {};

        for (const cubeId of cubeIds) {
            const cachePath = path.join(CACHE_CUBES_DIR, `${cubeId}.json`);

            if (!fs.existsSync(cachePath) || fs.statSync(cachePath).size === 0) {
                console.log(`[${cubeId}] No cached data, skipping.`);
                continue;
            }

            const stats = fs.statSync(cachePath);
            const fetchedAt = new Date(stats.mtimeMs).toISOString();

            try {
                const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
                const cube = remapCube(raw, false, fetchedAt);

                // Use the canonical cube.id as the key
                remappedCubes[cube.id] = cube;
                cubeEntries[cube.id] = { fetchedAt };

                // Write individual remapped cube file
                const outPath = path.join(GENERATED_CUBES_DIR, `${cube.id}.json`);
                fs.writeFileSync(outPath, JSON.stringify(cube));
            } catch (e: any) {
                console.error(`[${cubeId}] Failed to remap: ${e.message}`);
            }
        }

        // Compute similarity matrix for the collection
        if (Object.keys(remappedCubes).length > 0) {
            const similarityMatrix = computeSimilarityMatrix(remappedCubes);
            const simPath = path.join(GENERATED_SIMILARITIES_DIR, `${manifest.name}.json`);
            fs.writeFileSync(simPath, JSON.stringify(similarityMatrix));
            console.log(`[${manifest.name}] Wrote similarity matrix (${Object.keys(remappedCubes).length} cubes).`);
        }

        // Build preset entry
        const preset: PresetCollection = {
            name: manifest.name,
            label: manifest.label,
            cubes: cubeEntries,
        };
        if (manifest.description) preset.description = manifest.description;
        if (manifest.icon) preset.icon = manifest.icon;
        if (manifest.links && manifest.links.length > 0) {
            preset.links = manifest.links.map(l => {
                const link: { label: string; url: string; type?: string } = { label: l.label, url: l.url };
                if (l.type) link.type = l.type;
                return link;
            }) as PresetCollection['links'];
        }
        presets.push(preset);

        console.groupEnd();
    }

    // Write presets.json
    const presetsPath = path.join(GENERATED_DIR, 'presets.json');
    fs.writeFileSync(presetsPath, JSON.stringify(presets, null, 2));
    console.log(`\nWrote presets.json with ${presets.length} collections.`);
}

// --- Main ---

async function main() {
    ensureDirectories();

    const manifests = loadManifests();
    console.log(`Loaded ${manifests.length} manifests from ${MANIFESTS_DIR}`);

    if (fetchOnly) {
        await phaseFetch(manifests);
    } else if (assembleOnly) {
        await phaseAssemble(manifests);
    } else {
        await phaseFetch(manifests);
        await phaseAssemble(manifests);
    }

    console.log('\nDone.');
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
