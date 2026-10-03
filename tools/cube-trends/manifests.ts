import * as fs from 'fs';
import * as path from 'path';
import type { Manifest } from '../../preloads/manifests/types';

const DEFAULT_MANIFESTS_DIR = './preloads/manifests';
const DEFAULT_TOP100_PATH = './preloads/cache/cubecobra-top100-ids.json';

const VALID_MANIFEST_NAME = /^[A-Za-z0-9_-]+$/;

async function loadAllManifestFiles(manifestsDir: string): Promise<Manifest[]> {
    // Only manifest modules live at the top level of manifestsDir; shared types, helpers, and tests are excluded.
    const files = fs.readdirSync(manifestsDir).filter((f) =>
        f.endsWith('.ts') && f !== 'types.ts' && f !== 'filters.ts' && !f.endsWith('.test.ts'),
    );
    const manifests: Manifest[] = [];
    for (const f of files) {
        const mod = await import(path.resolve(manifestsDir, f));
        const manifest = mod.default as Manifest;
        if (!VALID_MANIFEST_NAME.test(manifest.name)) {
            // the name is used as an output directory segment, so it must stay within a safe charset.
            throw new Error(`Invalid manifest name "${manifest.name}" in ${f}: must match ${VALID_MANIFEST_NAME}`);
        }
        manifests.push(manifest);
    }
    return manifests;
}

function resolveCubes(manifest: Manifest, top100Path: string): Manifest {
    if (manifest.fetch?.source === 'cubecobra-top100') {
        if (!fs.existsSync(top100Path)) {
            throw new Error(
                `Manifest "${manifest.name}" needs preloads/cache/cubecobra-top100-ids.json — run npm run preload first.`,
            );
        }
        const ids: string[] = JSON.parse(fs.readFileSync(top100Path, 'utf8'));
        return { ...manifest, cubes: ids };
    }
    return manifest;
}

export async function loadManifests(
    selection: string[] | 'all',
    options?: { manifestsDir?: string; top100Path?: string },
): Promise<Manifest[]> {
    const manifestsDir = options?.manifestsDir ?? DEFAULT_MANIFESTS_DIR;
    const top100Path = options?.top100Path ?? DEFAULT_TOP100_PATH;

    const allManifests = await loadAllManifestFiles(manifestsDir);

    if (selection === 'all') {
        return allManifests.map((m) => resolveCubes(m, top100Path));
    }

    const byName = new Map(allManifests.map((m) => [m.name, m]));
    const missing = selection.filter((name) => !byName.has(name));
    if (missing.length > 0) {
        const valid = allManifests.map((m) => m.name).join(', ');
        throw new Error(`Unknown manifest(s): ${missing.join(', ')}. Valid manifests: ${valid}`);
    }

    return selection.map((name) => {
        const manifest = byName.get(name)!;
        return resolveCubes(manifest, top100Path);
    });
}
