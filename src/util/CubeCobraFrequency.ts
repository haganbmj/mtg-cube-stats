import type { CubeCobraFrequencyData } from '../types';
import { ref } from 'vue';
import { loadJsonAsset, registerKnownAssetUrl } from './AssetCache';
import frequencyUrl from '../../data/cubecobra-card-frequency.json?url';

// ---------------------------------------------------------------------------
// Lazy-load the frequency data file (Vite code-splits it into its own chunk).
// The file may not exist if the export script hasn't been run yet.
// ---------------------------------------------------------------------------

registerKnownAssetUrl(frequencyUrl);

let frequencyData: CubeCobraFrequencyData | null = null;
let initPromise: Promise<void> | null = null;

/** Reactive flag that becomes true once CubeCobra frequency data has finished loading. */
export const frequencyDataReady = ref(false);

export function initFrequencyData(): Promise<void> {
    if (!initPromise) initPromise = doInit();
    return initPromise;
}

async function doInit(): Promise<void> {
    try {
        const data = await loadJsonAsset<CubeCobraFrequencyData>(frequencyUrl, 'frequency');
        // Validate that the loaded data matches the expected shape.
        if (!data?.cubeCount || !data?.broadGroups || !data?.cards) {
            console.warn('CubeCobra frequency data has unexpected format — re-run the export script.');
            frequencyData = null;
            return;
        }
        frequencyData = data;
        frequencyDataReady.value = true;
        console.log(`Loaded CubeCobra frequency data (${Object.keys(frequencyData.cards).length} cards, generated ${frequencyData.generatedAt})`);
    } catch {
        console.warn('CubeCobra card frequency data not available — column will be hidden.');
        frequencyData = null;
    }
}

export function getFrequencyData(): CubeCobraFrequencyData | null {
    return frequencyData;
}

export function getCardFrequency(oracleId: string): Record<string, number> | null {
    return frequencyData?.cards[oracleId] ?? null;
}

// ---------------------------------------------------------------------------
// Category options for the toolbar dropdown
// ---------------------------------------------------------------------------

export interface FrequencyCategoryOption {
    label: string;
    value: string;
    group?: string;
}

export function getFrequencyCategoryOptions(): FrequencyCategoryOption[] {
    if (!frequencyData) return [];

    const options: FrequencyCategoryOption[] = [
        { label: 'All Cubes', value: 'total' },
        { label: 'Uncategorized', value: 'uncategorized' },
    ];

    // Broad groups (summed from exact variants at display time).
    for (const group of Object.keys(frequencyData.broadGroups)) {
        const label = group.charAt(0).toUpperCase() + group.slice(1);
        options.push({ label: `${label} (all)`, value: `broad:${group}`, group: 'Broad Groups' });
    }

    // Exact categories that actually have cubes (alphabetized).
    const skipKeys = new Set(['total', 'uncategorized']);
    const exactEntries = Object.entries(frequencyData.cubeCount)
        .filter(([cat, count]) => !skipKeys.has(cat) && count > 0)
        .sort(([a], [b]) => a.localeCompare(b));
    for (const [cat] of exactEntries) {
        options.push({ label: cat, value: cat, group: 'Exact Categories' });
    }

    return options;
}

/**
 * Resolve a selected category option value to the actual count for a card.
 * Handles broad group summation (e.g. "broad:pauper" sums all pauper variants).
 */
export function resolveCardCount(oracleId: string, categoryValue: string): number | null {
    if (!frequencyData) return null;
    const cardCounts = frequencyData.cards[oracleId];
    if (!cardCounts) return 0;

    if (categoryValue.startsWith('broad:')) {
        const group = categoryValue.slice(6);
        const variants = frequencyData.broadGroups[group];
        if (!variants) return 0;
        return variants.reduce((sum, cat) => sum + (cardCounts[cat] ?? 0), 0);
    }

    return cardCounts[categoryValue] ?? 0;
}

/**
 * Resolve the total cube count for a category option value.
 * Handles broad group summation.
 */
export function resolveCubeCount(categoryValue: string): number | null {
    if (!frequencyData) return null;

    if (categoryValue.startsWith('broad:')) {
        const group = categoryValue.slice(6);
        const variants = frequencyData.broadGroups[group];
        if (!variants) return 0;
        return variants.reduce((sum, cat) => sum + (frequencyData!.cubeCount[cat] ?? 0), 0);
    }

    return frequencyData.cubeCount[categoryValue] ?? 0;
}

// ---------------------------------------------------------------------------
// Frequency column registry — single source of truth for per-category columns
// ---------------------------------------------------------------------------

export interface FrequencyColumnDef {
    /** The value passed to resolveCardCount / resolveCubeCount (e.g. 'total', 'broad:pauper') */
    categoryValue: string;
    /** The key used on the enriched row data property (e.g. 'globalRatePercent_total') */
    propKey: string;
    /** The key used in tableColumns / visibleColumns config (e.g. 'globalRate_total') */
    columnKey: string;
    /** Display label in column header and Customize Columns */
    label: string;
    /** Group label in Customize Columns */
    group: 'Broad Groups' | 'Exact Categories';
}

export const FREQUENCY_COLUMNS: FrequencyColumnDef[] = [
    { categoryValue: 'total', propKey: 'globalRatePercent_total', columnKey: 'globalRate_total', label: 'All Cubes', group: 'Broad Groups' },
    { categoryValue: 'broad:pauper', propKey: 'globalRatePercent_broad_pauper', columnKey: 'globalRate_broad_pauper', label: 'Pauper (all)', group: 'Broad Groups' },
    { categoryValue: 'broad:peasant', propKey: 'globalRatePercent_broad_peasant', columnKey: 'globalRate_broad_peasant', label: 'Peasant (all)', group: 'Broad Groups' },
    { categoryValue: 'uncategorized', propKey: 'globalRatePercent_uncategorized', columnKey: 'globalRate_uncategorized', label: 'Uncategorized', group: 'Exact Categories' },
    { categoryValue: 'powered', propKey: 'globalRatePercent_powered', columnKey: 'globalRate_powered', label: 'Powered', group: 'Exact Categories' },
    { categoryValue: 'desert', propKey: 'globalRatePercent_desert', columnKey: 'globalRate_desert', label: 'Desert', group: 'Exact Categories' },
    { categoryValue: 'pauper', propKey: 'globalRatePercent_pauper', columnKey: 'globalRate_pauper', label: 'Pauper', group: 'Exact Categories' },
    { categoryValue: 'pauper+', propKey: 'globalRatePercent_pauper_plus', columnKey: 'globalRate_pauper_plus', label: 'Pauper+', group: 'Exact Categories' },
    { categoryValue: 'pauper-ish', propKey: 'globalRatePercent_pauper_ish', columnKey: 'globalRate_pauper_ish', label: 'Pauper-ish', group: 'Exact Categories' },
    { categoryValue: 'pauper+ish', propKey: 'globalRatePercent_pauper_plus_ish', columnKey: 'globalRate_pauper_plus_ish', label: 'Pauper+ish', group: 'Exact Categories' },
    { categoryValue: 'peasant', propKey: 'globalRatePercent_peasant', columnKey: 'globalRate_peasant', label: 'Peasant', group: 'Exact Categories' },
    { categoryValue: 'peasant+', propKey: 'globalRatePercent_peasant_plus', columnKey: 'globalRate_peasant_plus', label: 'Peasant+', group: 'Exact Categories' },
    { categoryValue: 'peasant-ish', propKey: 'globalRatePercent_peasant_ish', columnKey: 'globalRate_peasant_ish', label: 'Peasant-ish', group: 'Exact Categories' },
    { categoryValue: 'peasant+ish', propKey: 'globalRatePercent_peasant_plus_ish', columnKey: 'globalRate_peasant_plus_ish', label: 'Peasant+ish', group: 'Exact Categories' },
];

/**
 * Resolve all rate percentages for a card (one per FREQUENCY_COLUMNS entry).
 * Returns a flat object with propKey → percentage (or null).
 */
export function resolveAllRates(oracleId: string): Record<string, number | null> {
    const result: Record<string, number | null> = {};
    for (const col of FREQUENCY_COLUMNS) {
        const count = resolveCardCount(oracleId, col.categoryValue);
        const total = resolveCubeCount(col.categoryValue);
        result[col.propKey] = (count == null || !total) ? null : (count / total) * 100;
    }
    return result;
}
