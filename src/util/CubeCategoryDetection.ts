import type { CubeCard } from '../types';

export interface CubeCategoryDefinition {
    id: number;
    memberCount: number;
    /** Cluster IDs (0-indexed) most over-represented in this category. */
    topClusters: number[];
    /** Human-readable label derived from top cluster numbers. */
    label: string;
    /** Normalized cluster-count centroid vector (length = clusterCount). */
    centroid: number[];
}

interface CubeCategoriesData {
    numCategories: number;
    clusterCount: number;
    minCubeCards: number;
    cubeCount: number;
    categories: CubeCategoryDefinition[];
}

const categoriesLoad = () =>
    import('../../data/cubecobra-cube-categories.json') as Promise<{ default: CubeCategoriesData }>;

let categoriesData: CubeCategoriesData | null = null;

export async function initCubeCategoryData(): Promise<void> {
    if (categoriesData) return;
    try {
        const module = await categoriesLoad();
        categoriesData = module.default;
    } catch {
        // File may not exist yet (compute-archetypes.ts not run, or older run).
        categoriesData = null;
    }
}

export function getCategoryDefinitions(): CubeCategoryDefinition[] {
    return categoriesData?.categories ?? [];
}

/**
 * Classify a cube by comparing its cluster profile to the category centroids.
 *
 * The cluster profile is computed from the cube's cards using the primary
 * cluster assignment for each card (same method as the training data).
 * Returns null if category data hasn't been loaded or the cube has no data.
 */
export function classifyCube(
    cards: CubeCard[],
    cardClusters: Record<string, { clusterId: number; weight: number }[]>,
): CubeCategoryDefinition | null {
    if (!categoriesData || cards.length === 0) return null;

    const { clusterCount, categories } = categoriesData;

    // Build normalized cluster profile using primary assignment per card.
    const profile = new Array<number>(clusterCount).fill(0);
    let validCards = 0;

    for (const card of cards) {
        const assignments = cardClusters[card.oracleId];
        if (!assignments || assignments.length === 0) continue;
        const primaryId = assignments[0].clusterId;
        if (primaryId >= 0 && primaryId < clusterCount) {
            profile[primaryId]++;
            validCards++;
        }
    }

    if (validCards === 0) return null;
    for (let j = 0; j < clusterCount; j++) profile[j] /= validCards;

    // Find nearest category centroid by squared L2 distance.
    let minDist = Infinity;
    let nearest: CubeCategoryDefinition | null = null;

    for (const category of categories) {
        let d = 0;
        for (let j = 0; j < clusterCount; j++) {
            const diff = profile[j] - (category.centroid[j] ?? 0);
            d += diff * diff;
        }
        if (d < minDist) {
            minDist = d;
            nearest = category;
        }
    }

    return nearest;
}
