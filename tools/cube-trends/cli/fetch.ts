import { parseArgs } from './args';
import { loadManifests } from '../manifests';
import { resolveConfig } from '../config';
import { sampleDates } from '../fetch/sampling';
import { createCubeFetcher, mapPool } from '../fetch/client';
import { createCacheStore, DEFAULT_CACHE_DIR } from '../fetch/store';
import { walkCube } from '../fetch/walk';
import { parseDuration } from '../../../preloads/manifests/filters';

async function main(): Promise<void> {
    const { manifests: selection, overrides } = parseArgs(process.argv.slice(2));
    const manifests = await loadManifests(selection);

    const store = createCacheStore(DEFAULT_CACHE_DIR);
    const firstConfig = resolveConfig(manifests[0].name, overrides);
    const fetcher = createCubeFetcher({
        concurrency: firstConfig.concurrency,
        delayMs: firstConfig.requestDelayMs,
        maxRetries: firstConfig.maxRetries,
    });

    const now = Date.now();

    for (const manifest of manifests) {
        const config = resolveConfig(manifest.name, overrides);
        const samples = sampleDates(now, parseDuration(config.interval), parseDuration(config.range));

        const results = await mapPool(manifest.cubes, config.concurrency, (cubeId) =>
            walkCube(cubeId, samples, { now: () => now, fetcher, store, log: console.error }),
        );

        const totalRequests = results.reduce((sum, r) => sum + r.requests, 0);
        const cubesWithGaps = results.filter((r) => r.index.gaps.length > 0);
        const totalGapSamples = cubesWithGaps.reduce((sum, r) => sum + r.index.gaps.length, 0);
        const missingIds = manifest.cubes.filter((_, i) => results[i].index.missing);

        console.log(
            `[${manifest.name}] cubes=${manifest.cubes.length} requests=${totalRequests} ` +
            `gaps=${cubesWithGaps.length} (${totalGapSamples} samples) ` +
            `missing=${missingIds.length === 0 ? 'none' : missingIds.join(', ')}`,
        );
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
