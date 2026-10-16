import * as fs from 'fs';
import { parseArgs } from './args';
import { loadManifests } from '../manifests';
import { resolveConfig } from '../config';
import { sampleDates } from '../fetch/sampling';
import { createCacheStore, DEFAULT_CACHE_DIR } from '../fetch/store';
import { parseDuration } from '../../../preloads/manifests/filters';
import { computeEligibility, readJsonlLines } from '../analysis/eligibility';
import { selectMembers, buildPanel, gridAnchor, type MemberEntry } from '../analysis/panel';
import { buildContext, type SetInfo } from '../analysis/context';
import { analyzeCards } from '../analysis/cards';
import { analyzeTimeline } from '../analysis/timeline';
import { analyzeSets } from '../analysis/sets';
import { analyzeShape } from '../analysis/shape';
import { analyzeChurn } from '../analysis/churn';
import { analyzeSurvival } from '../analysis/survival';
import { analyzeTrendsetters } from '../analysis/trendsetters';
import { analyzeSubstitutions } from '../analysis/substitutions';
import { analyzeConsensus } from '../analysis/consensus';
import { writeOutputs, DEFAULT_OUTPUT_DIR, type MetaResult } from '../output';
import type { Eligibility, EligibilityRule } from '../types';
import type { ScryfallDataStructure } from '../../../src/types/scryfall';

const INCLUDED_SET_TYPES = new Set(['expansion', 'core', 'masters', 'draft_innovation', 'commander']);

interface RawSet {
    code: string;
    name: string;
    released_at?: string;
    set_type: string;
}

function loadSets(): SetInfo[] {
    const raw: { data: RawSet[] } = JSON.parse(fs.readFileSync('data/sets.json', 'utf8'));
    return raw.data
        .filter((set) => INCLUDED_SET_TYPES.has(set.set_type) && set.released_at)
        .map((set) => ({ code: set.code.toLowerCase(), name: set.name, releasedAt: Date.parse(set.released_at!) }));
}

async function main(): Promise<void> {
    const { manifests: selection, overrides } = parseArgs(process.argv.slice(2));
    const manifests = await loadManifests(selection);

    const store = createCacheStore(DEFAULT_CACHE_DIR);

    const cardsData: ScryfallDataStructure = JSON.parse(fs.readFileSync('data/cards-minimized.json', 'utf8'));
    const sets = loadSets();

    const eligibilityCache = new Map<EligibilityRule, Map<string, Eligibility>>();
    async function getEligibility(rule: EligibilityRule): Promise<Map<string, Eligibility>> {
        let cached = eligibilityCache.get(rule);
        if (!cached) {
            cached = await computeEligibility(readJsonlLines('data/default-cards.jsonl'), rule);
            eligibilityCache.set(rule, cached);
        }
        return cached;
    }

    for (const manifest of manifests) {
        const tStart = Date.now();
        const config = resolveConfig(manifest.name, overrides);

        const entries: MemberEntry[] = [];
        const missing: string[] = [];
        for (const cubeId of manifest.cubes) {
            const index = store.readIndex(cubeId);
            if (!index || index.missing) {
                missing.push(cubeId);
                continue;
            }
            entries.push({ cubeId, index });
        }

        const members = selectMembers(manifest, entries, (cubeId, id) => store.readRevision(cubeId, id));
        console.log(`[${manifest.name}] members selected in ${Date.now() - tStart}ms (${members.length}/${manifest.cubes.length})`);

        const anchor = gridAnchor(members.map((m) => m.index)) ?? Date.now();
        const samples = sampleDates(anchor, parseDuration(config.interval), parseDuration(config.range));

        const outDir = `${DEFAULT_OUTPUT_DIR}/${manifest.name}`;

        if (members.length === 0) {
            const meta: MetaResult = {
                manifest: manifest.name,
                label: manifest.label,
                generatedAt: Date.now(),
                config,
                samples,
                cubes: [],
                missing,
                unknownCards: 0,
                empty: 'No cached cubes matched this manifest. Run trends:fetch first.',
            };
            writeOutputs(outDir, { meta });
            console.log(`[${manifest.name}] no members; wrote meta.json only`);
            continue;
        }

        const eligibility = await getEligibility(config.eligibility);

        const tPanel = Date.now();
        const panel = buildPanel({
            samples,
            members,
            loadRevision: (cubeId, id) => store.readRevision(cubeId, id),
            cards: cardsData.cards,
            eligibility,
            includeBasics: config.includeBasics,
        });
        console.log(`[${manifest.name}] panel built in ${Date.now() - tPanel}ms`);

        const tContext = Date.now();
        const ctx = buildContext(panel, config, sets);
        console.log(`[${manifest.name}] context built in ${Date.now() - tContext}ms`);

        const tAnalyze = Date.now();
        const timeline = analyzeTimeline(ctx);
        const cards = analyzeCards(ctx);
        const setsResult = analyzeSets(ctx);
        const shape = analyzeShape(ctx);
        const churn = analyzeChurn(ctx);
        const survival = analyzeSurvival(ctx);
        const trendsetters = analyzeTrendsetters(ctx);
        const substitutions = analyzeSubstitutions(ctx);
        const consensus = analyzeConsensus(ctx, shape);
        console.log(`[${manifest.name}] analyses ran in ${Date.now() - tAnalyze}ms`);

        const cubesMeta = panel.cubes.map((cube, i) => ({
            ...cube,
            coverage: panel.grid[i].filter((id) => id !== null).length,
            gaps: members[i].index.gaps.length,
        }));

        const meta: MetaResult = {
            manifest: manifest.name,
            label: manifest.label,
            generatedAt: Date.now(),
            config,
            samples,
            cubes: cubesMeta,
            missing,
            unknownCards: panel.unknownCards,
        };

        writeOutputs(outDir, {
            timeline,
            cards,
            sets: setsResult,
            shape,
            churn,
            survival,
            trendsetters,
            substitutions,
            consensus,
            meta,
        });

        console.log(`[${manifest.name}] done in ${Date.now() - tStart}ms`);
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
