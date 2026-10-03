import * as fs from 'fs';
import * as path from 'path';
import type { Manifest } from '../../preloads/manifests/types';

const MANIFESTS_DIR = './preloads/manifests';
const TOP100_IDS_PATH = './preloads/cache/cubecobra-top100-ids.json';

async function loadAllManifestFiles(): Promise<Manifest[]> {
    // Only manifest modules live at the top level of MANIFESTS_DIR; shared types, helpers, and tests are excluded.
    const files = fs.readdirSync(MANIFESTS_DIR).filter((f) =>
        f.endsWith('.ts') && f !== 'types.ts' && f !== 'filters.ts' && !f.endsWith('.test.ts'),
    );
    const manifests: Manifest[] = [];
    for (const f of files) {
        const mod = await import(path.resolve(MANIFESTS_DIR, f));
        manifests.push(mod.default as Manifest);
    }
    return manifests;
}

function resolveCubes(manifest: Manifest): Manifest {
    if (manifest.fetch?.source === 'cubecobra-top100') {
        const ids: string[] = JSON.parse(fs.readFileSync(TOP100_IDS_PATH, 'utf8'));
        return { ...manifest, cubes: ids };
    }
    return manifest;
}

export async function loadManifests(selection: string[] | 'all'): Promise<Manifest[]> {
    const resolved = (await loadAllManifestFiles()).map(resolveCubes);

    if (selection === 'all') {
        return resolved;
    }

    const byName = new Map(resolved.map((m) => [m.name, m]));
    const missing = selection.filter((name) => !byName.has(name));
    if (missing.length > 0) {
        const valid = resolved.map((m) => m.name).join(', ');
        throw new Error(`Unknown manifest(s): ${missing.join(', ')}. Valid manifests: ${valid}`);
    }

    return selection.map((name) => byName.get(name)!);
}
