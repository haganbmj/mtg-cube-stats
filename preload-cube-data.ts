import fs from 'fs';
import path from 'path';
import { remapCube, computeSimilarityMatrix } from './src/util/CubeFunctions';
import { getCubeData, fetchTopCubeIds } from './src/util/CubeCobra';
import type { Cube } from './src/types';
import type { PresetCollection } from './src/types/presets';
import type { CubePredicate, Manifest } from './preloads/manifests/types';
import { parseDuration } from './preloads/manifests/filters';

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

// --- Helpers ---

function isStale(filePath: string, thresholdMs: number): boolean {
    if (!fs.existsSync(filePath)) return true;
    const stats = fs.statSync(filePath);
    if (stats.size === 0) return true;
    return (Date.now() - stats.mtimeMs) > thresholdMs;
}

async function loadManifests(): Promise<Manifest[]> {
    const files = fs.readdirSync(MANIFESTS_DIR).filter(f =>
        f.endsWith('.ts') && f !== 'types.ts' && f !== 'filters.ts' && !f.endsWith('.test.ts'),
    );
    const manifests: Manifest[] = [];
    for (const f of files) {
        const mod = await import(path.resolve(MANIFESTS_DIR, f));
        manifests.push(mod.default as Manifest);
    }
    return manifests;
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

                const thresholdMs = parseDuration(manifest.fetch.staleThreshold);

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

function normalizeIncludes(include: Manifest['include']): CubePredicate[] {
    if (!include) return [];
    return Array.isArray(include) ? include : [include];
}

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

                const predicates = normalizeIncludes(manifest.include);
                if (predicates.length && !predicates.every(p => p(cube))) {
                    console.log(`[${cubeId}] Filtered out by include predicates.`);
                    continue;
                }

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

// --- Phase 3: Prune ---

async function phasePrune(manifests: Manifest[]) {
    console.log('\n=== Phase 3: Prune ===\n');

    // Collect all cube IDs referenced by any manifest (including dynamic sources)
    const referencedIds = new Set<string>();
    for (const manifest of manifests) {
        const cubeIds = await resolveManifestCubes(manifest);
        for (const id of cubeIds) {
            referencedIds.add(id);
        }
    }

    // Also include canonical IDs from generated cubes (remapCube may change IDs)
    // Read the presets.json to get the canonical IDs that were actually written
    const presetsPath = path.join(GENERATED_DIR, 'presets.json');
    if (fs.existsSync(presetsPath)) {
        const presets: PresetCollection[] = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
        for (const preset of presets) {
            for (const id of Object.keys(preset.cubes)) {
                referencedIds.add(id);
            }
        }
    }

    // Prune cache/cubes/
    let cacheRemoved = 0;
    if (fs.existsSync(CACHE_CUBES_DIR)) {
        for (const file of fs.readdirSync(CACHE_CUBES_DIR)) {
            const id = file.replace('.json', '');
            if (!referencedIds.has(id)) {
                fs.unlinkSync(path.join(CACHE_CUBES_DIR, file));
                cacheRemoved++;
            }
        }
    }

    // Prune generated/cubes/
    let generatedRemoved = 0;
    if (fs.existsSync(GENERATED_CUBES_DIR)) {
        for (const file of fs.readdirSync(GENERATED_CUBES_DIR)) {
            const id = file.replace('.json', '');
            if (!referencedIds.has(id)) {
                fs.unlinkSync(path.join(GENERATED_CUBES_DIR, file));
                generatedRemoved++;
            }
        }
    }

    // Prune generated/similarities/ (remove matrices for manifests that no longer exist)
    let simRemoved = 0;
    const manifestNames = new Set(manifests.map(m => m.name));
    if (fs.existsSync(GENERATED_SIMILARITIES_DIR)) {
        for (const file of fs.readdirSync(GENERATED_SIMILARITIES_DIR)) {
            const name = file.replace('.json', '');
            if (!manifestNames.has(name)) {
                fs.unlinkSync(path.join(GENERATED_SIMILARITIES_DIR, file));
                simRemoved++;
            }
        }
    }

    if (cacheRemoved + generatedRemoved + simRemoved > 0) {
        console.log(`Pruned ${cacheRemoved} cached, ${generatedRemoved} generated cube(s), ${simRemoved} similarity file(s).`);
    } else {
        console.log('No orphaned files to prune.');
    }
}

// --- Main ---

async function main() {
    ensureDirectories();

    const manifests = await loadManifests();
    console.log(`Loaded ${manifests.length} manifests from ${MANIFESTS_DIR}`);

    if (fetchOnly) {
        await phaseFetch(manifests);
    } else if (assembleOnly) {
        await phaseAssemble(manifests);
    } else {
        await phaseFetch(manifests);
        await phaseAssemble(manifests);
    }

    await phasePrune(manifests);

    console.log('\nDone.');
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
