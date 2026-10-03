import type { TrendsConfig } from '../types';

export interface ParsedArgs {
    manifests: string[] | 'all';
    overrides: Partial<TrendsConfig>;
}

const KNOWN_FLAGS = new Set(['--manifest', '--all', '--interval', '--range', '--concurrency', '--include-basics']);

const USAGE = 'Usage: trends:fetch (--manifest <names> | --all) [--interval <dur>] [--range <dur>] [--concurrency <n>] [--include-basics]';

export function parseArgs(argv: string[]): ParsedArgs {
    let manifests: string[] | 'all' | null = null;
    const overrides: Partial<TrendsConfig> = {};

    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        if (!KNOWN_FLAGS.has(flag)) {
            throw new Error(`Unknown flag: ${flag}\n${USAGE}`);
        }
        switch (flag) {
            case '--manifest':
                manifests = argv[(i += 1)].split(',').map((s) => s.trim()).filter(Boolean);
                break;
            case '--all':
                manifests = 'all';
                break;
            case '--interval':
                overrides.interval = argv[(i += 1)];
                break;
            case '--range':
                overrides.range = argv[(i += 1)];
                break;
            case '--concurrency':
                overrides.concurrency = Number(argv[(i += 1)]);
                break;
            case '--include-basics':
                overrides.includeBasics = true;
                break;
        }
    }

    if (manifests === null) {
        throw new Error(USAGE);
    }

    return { manifests, overrides };
}
