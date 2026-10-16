import * as fs from 'fs';
import * as path from 'path';
import type { ComplexityComponents, Cube, CubeCard, PresetCollection, ScryfallDataStructure } from '../../src/types';
import { COMPLEXITY_BOUNDS, computeComplexityComponents, scoreComplexity } from '../../src/util/Complexity';
import { DEFAULT_KEYWORD_COST_TABLE } from '../../src/util/KeywordCosts';

const CARDS_PATH = 'data/cards-minimized.json';
const CUBES_DIR = 'preloads/generated/cubes';
const PRESETS_PATH = 'preloads/generated/presets.json';
const REFERENCE_PRESET = 'capitol-cube-champs-2026';
const REFERENCE_TOP = ['trinket', 'bacon'];
const REFERENCE_BOTTOM = ['limited masters', 'fast and friendly'];
const REFERENCE_SLACK = 5;

const COMPONENT_KEYS = Object.keys(COMPLEXITY_BOUNDS) as (keyof ComplexityComponents)[];

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
    if (sorted.length === 0) {
        return 0;
    }
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function main(): void {
    const scryfall = readJson<ScryfallDataStructure>(CARDS_PATH);
    const table = scryfall.keywordCosts ?? DEFAULT_KEYWORD_COST_TABLE;

    const rawById = new Map<string, { name: string; raw: ComplexityComponents }>();
    for (const file of fs.readdirSync(CUBES_DIR).filter(f => f.endsWith('.json'))) {
        const cube = readJson<Cube>(path.join(CUBES_DIR, file));
        const cards = (cube.cards ?? []).map(card => enrichCard(card, scryfall));
        rawById.set(cube.id, { name: cube.name, raw: computeComplexityComponents(cards, table) });
    }

    console.log(`Computed raw components for ${rawById.size} cubes.\n`);
    console.log('export const COMPLEXITY_BOUNDS: Record<ComponentKey, { low: number; high: number }> = {');
    for (const key of COMPONENT_KEYS) {
        const sorted = [...rawById.values()].map(c => c.raw[key]).sort((a, b) => a - b);
        const low = percentile(sorted, 0.05).toFixed(2);
        const high = percentile(sorted, 0.95).toFixed(2);
        console.log(`    ${key}: { low: ${low}, high: ${high} },`);
    }
    console.log('};\n');

    const preset = readJson<PresetCollection[]>(PRESETS_PATH).find(p => p.name === REFERENCE_PRESET);
    if (!preset) {
        console.log(`Preset ${REFERENCE_PRESET} not found; skipping reference check.`);
        return;
    }

    const ranked = Object.keys(preset.cubes)
        .flatMap(id => {
            const entry = rawById.get(id);
            if (!entry) {
                console.warn(`Missing generated cube ${id} from ${REFERENCE_PRESET}.`);
                return [];
            }
            return [{ name: entry.name, ...scoreComplexity(entry.raw) }];
        })
        .sort((a, b) => b.score - a.score);

    console.log(`${preset.label} ranking:`);
    console.log(['rank', 'score', ...COMPONENT_KEYS, 'name'].join('\t'));
    ranked.forEach((cube, i) => {
        const values = COMPONENT_KEYS.map(key => cube.breakdown.normalized[key].toFixed(2));
        console.log([i + 1, cube.score, ...values, cube.name].join('\t'));
    });

    const rankOf = (needle: string) => 1 + ranked.findIndex(c => c.name.toLowerCase().includes(needle));
    const checks = [
        ...REFERENCE_TOP.map(needle => {
            const rank = rankOf(needle);
            return { needle, rank, pass: rank > 0 && rank <= REFERENCE_SLACK };
        }),
        ...REFERENCE_BOTTOM.map(needle => {
            const rank = rankOf(needle);
            return { needle, rank, pass: rank > ranked.length - REFERENCE_SLACK };
        }),
    ];
    console.log('');
    for (const check of checks) {
        console.log(`${check.pass ? 'ok  ' : 'miss'} ${check.needle}: rank ${check.rank || 'not found'} of ${ranked.length}`);
    }
    console.log(`Reference check (top/bottom ${REFERENCE_SLACK}): ${checks.every(c => c.pass) ? 'PASS' : 'FAIL'}`);
}

main();
