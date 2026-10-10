import * as fs from 'fs';
import * as path from 'path';
import type { Ms, TrendsConfig } from './types';
import type { PanelCube } from './analysis/panel';

export const DEFAULT_OUTPUT_DIR = 'tools/cube-trends/output';

export interface MetaResult {
    manifest: string;
    label: string;
    generatedAt: Ms;
    config: TrendsConfig;
    samples: Ms[];
    cubes: (PanelCube & { coverage: number; gaps: number })[];
    missing: string[];
    unknownCards: number;
    empty?: string;
}

function replacer(_key: string, value: unknown): unknown {
    if (value instanceof Map) {
        return Object.fromEntries(value);
    }
    if (value instanceof Set) {
        return [...value];
    }
    return value;
}

// Walks the value tree ahead of serialization so a bad number is caught with a precise key path.
function assertFinite(fileName: string, value: unknown, keyPath: string): void {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid number (${value}) in ${fileName}.json at ${keyPath}`);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((v, i) => assertFinite(fileName, v, `${keyPath}[${i}]`));
        return;
    }
    if (value instanceof Map) {
        for (const [k, v] of value) {
            assertFinite(fileName, v, `${keyPath}.${k}`);
        }
        return;
    }
    if (value instanceof Set) {
        [...value].forEach((v, i) => assertFinite(fileName, v, `${keyPath}<${i}>`));
        return;
    }
    if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
            assertFinite(fileName, v, keyPath ? `${keyPath}.${k}` : k);
        }
    }
}

export function writeOutputs(dir: string, files: Record<string, unknown>): void {
    fs.mkdirSync(dir, { recursive: true });

    const names = Object.keys(files).filter((name) => name !== 'meta');
    for (const name of names) {
        assertFinite(name, files[name], '');
        fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(files[name], replacer));
    }

    if ('meta' in files) {
        assertFinite('meta', files.meta, '');
        fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(files.meta, replacer));
    }
}
