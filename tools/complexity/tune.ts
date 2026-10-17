import * as fs from 'fs';
import * as path from 'path';
import type { ComplexityBreakdown, ComplexityComponents, Cube, CubeCard, PresetCollection, ScryfallDataStructure } from '../../src/types';
import { COMPLEXITY_COMPONENT_KEYS, computeComplexityComponents, scoreComplexity } from '../../src/util/Complexity';
import { DEFAULT_KEYWORD_COST_TABLE } from '../../src/util/KeywordCosts';

const CARDS_PATH = 'data/cards-minimized.json';
const CUBES_DIR = 'preloads/generated/cubes';
const PRESETS_PATH = 'preloads/generated/presets.json';
const CORPUS_PRESET = 'cubecobra-top100';
const REFERENCE_TOP = ['aquaone powered', 'Bodleian Cube', 'LSVCube', 'Nitpicking Nerds Commander Cube'];
const REFERENCE_BOTTOM = ['Sacred Geometry', 'Alpha Reimagined', 'CLASSIC CUBE', 'Ancient Times', 'Pink Sleeves'];
const EXTRA_BREAKDOWNS = ['The Amonkar Desert', '100 Ornithopters'];
const REFERENCE_SLACK = 25;

interface ScoredCube {
    name: string;
    score: number;
    breakdown: ComplexityBreakdown;
}

function readJson<T>(file: string): T {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

function enrichCard(card: CubeCard, scryfall: ScryfallDataStructure): CubeCard {
    if (card.isCustomCard) {
        return { ...card, effectiveTypes: card.typeLine?.includes('Land') ? ['Land'] : [] };
    }
    // Unknown oracle IDs end up with no words/keywords and a normal layout, like custom cards.
    return { ...card, ...scryfall.cards[card.oracleId], popularity: card.popularity };
}

function percentile(sorted: number[], p: number): number {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

// Older presets.json files list cubes as an array of ids.
function presetCubeIds(preset: PresetCollection): string[] {
    const cubes = preset.cubes as PresetCollection['cubes'] | string[];
    return Array.isArray(cubes) ? cubes : Object.keys(cubes);
}

function main(): void {
    const scryfall = readJson<ScryfallDataStructure>(CARDS_PATH);
    if (!scryfall.keywordCosts) {
        console.warn(`Warning: ${CARDS_PATH} has no keywordCosts; using the default keyword cost table, so the derived bounds will be wrong. Re-run \`npm run cards\` to regenerate it.`);
    }
    const table = scryfall.keywordCosts ?? DEFAULT_KEYWORD_COST_TABLE;

    const preset = readJson<PresetCollection[]>(PRESETS_PATH).find(p => p.name === CORPUS_PRESET);
    if (!preset) {
        console.error(`Preset ${CORPUS_PRESET} not found in ${PRESETS_PATH}; run \`npm run preload\` first.`);
        process.exit(1);
    }

    const corpus: { name: string; raw: ComplexityComponents }[] = [];
    for (const id of presetCubeIds(preset)) {
        const file = path.join(CUBES_DIR, `${id}.json`);
        if (!fs.existsSync(file)) {
            console.warn(`Warning: no generated file for ${CORPUS_PRESET} cube ${id} (${file}).`);
            continue;
        }
        const cube = readJson<Cube>(file);
        const cards = (cube.cards ?? []).map(card => enrichCard(card, scryfall));
        corpus.push({ name: cube.name, raw: computeComplexityComponents(cards, table) });
    }

    console.log(`Computed raw components for ${corpus.length} ${CORPUS_PRESET} cubes.\n`);
    console.log('export const COMPLEXITY_BOUNDS: Record<ComplexityComponentKey, { low: number; high: number }> = {');
    for (const key of COMPLEXITY_COMPONENT_KEYS) {
        const sorted = corpus
            .map(c => c.raw[key])
            .filter((value): value is number => value !== null)
            .sort((a, b) => a - b);
        if (sorted.length === 0) {
            console.warn(`Warning: no non-null ${key} values in the corpus; bounds unavailable.`);
            console.log(`    ${key}: { low: 0, high: 0 },`);
            continue;
        }
        const low = percentile(sorted, 0.05).toFixed(3);
        const high = percentile(sorted, 0.95).toFixed(3);
        console.log(`    ${key}: { low: ${low}, high: ${high} },`);
    }
    console.log('};\n');

    const ranked: ScoredCube[] = corpus
        .map(cube => ({ name: cube.name, ...scoreComplexity(cube.raw) }))
        .sort((a, b) => b.score - a.score);

    console.log(`${preset.label} ranking:`);
    console.log(['rank', 'score', 'name'].join('\t'));
    ranked.forEach((cube, i) => console.log([i + 1, cube.score, cube.name].join('\t')));

    const warnedDuplicates = new Set<string>();
    const findCube = (name: string) => {
        const matches = ranked.filter(c => c.name.toLowerCase() === name.toLowerCase());
        if (matches.length > 1 && !warnedDuplicates.has(name)) {
            warnedDuplicates.add(name);
            console.warn(`Warning: ${matches.length} cubes in ${CORPUS_PRESET} match "${name}"; using the highest-scoring one.`);
        }
        return matches[0];
    };

    console.log('\nBreakdowns (normalized):');
    console.log(['score', ...COMPLEXITY_COMPONENT_KEYS, 'name'].join('\t'));
    for (const name of [...REFERENCE_TOP, ...REFERENCE_BOTTOM, ...EXTRA_BREAKDOWNS]) {
        const cube = findCube(name);
        if (!cube) {
            console.log(`not found: ${name}`);
            continue;
        }
        const values = COMPLEXITY_COMPONENT_KEYS.map(key => cube.breakdown.normalized[key]?.toFixed(2) ?? 'n/a');
        console.log([cube.score, ...values, cube.name].join('\t'));
    }

    // Ties resolve pessimistically: a tied top cube ranks below its ties, a tied bottom cube above them.
    const topRank = (cube: ScoredCube) => ranked.filter(c => c.score >= cube.score).length;
    const bottomRank = (cube: ScoredCube) => ranked.filter(c => c.score > cube.score).length + 1;
    const check = (name: string, top: boolean) => {
        const cube = findCube(name);
        if (!cube) {
            console.log(`${name}: not in collection — skipped`);
            return null;
        }
        const rank = top ? topRank(cube) : bottomRank(cube);
        const pass = top ? rank <= REFERENCE_SLACK : rank > ranked.length - REFERENCE_SLACK;
        console.log(`${pass ? 'ok  ' : 'miss'} ${name}: rank ${rank} of ${ranked.length}`);
        return pass;
    };
    console.log('');
    const topChecks = REFERENCE_TOP.map(name => check(name, true)).filter(pass => pass !== null);
    const bottomChecks = REFERENCE_BOTTOM.map(name => check(name, false)).filter(pass => pass !== null);
    // Require at least one present reference on each side so the check can't pass vacuously.
    const passed = topChecks.length > 0 && bottomChecks.length > 0 && [...topChecks, ...bottomChecks].every(Boolean);
    if (topChecks.length === 0) {
        console.log('No top reference cubes are in the collection.');
    }
    if (bottomChecks.length === 0) {
        console.log('No bottom reference cubes are in the collection.');
    }
    console.log(`Reference check (top/bottom ${REFERENCE_SLACK}): ${passed ? 'PASS' : 'FAIL'}`);
}

main();
