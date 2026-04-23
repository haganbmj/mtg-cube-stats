import type { CubeCobraFrequencyData } from '../types';
import { ref } from 'vue';

// ---------------------------------------------------------------------------
// Lazy-load the frequency data file (Vite code-splits it into its own chunk).
// The file may not exist if the export script hasn't been run yet.
// ---------------------------------------------------------------------------

let frequencyData: CubeCobraFrequencyData | null = null;

/** Reactive flag that becomes true once CubeCobra frequency data has finished loading. */
export const frequencyDataReady = ref(false);

export async function initFrequencyData(): Promise<void> {
    try {
        const mod = await import('../../data/cubecobra-card-frequency.json') as { default: CubeCobraFrequencyData };
        const data = mod.default;
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
