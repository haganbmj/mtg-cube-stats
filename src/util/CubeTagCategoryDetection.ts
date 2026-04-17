import type { CubeCard } from '../types';

export interface TagCategoryDefinition {
    id: number;
    memberCount: number;
    /** Tag labels most over-represented in this category relative to the global average. */
    topTags: string[];
    /** Human-readable label derived from top tag names. */
    label: string;
    /** Normalized tag-frequency centroid vector (length = tagVocabulary.length). */
    centroid: number[];
}

interface TagCategoriesData {
    numCategories: number;
    tagVocabulary: string[];
    minTagCardCount: number;
    minCubeCards: number;
    cubeCount: number;
    categories: TagCategoryDefinition[];
}

const tagCategoriesLoad = () =>
    import('../../data/cubecobra-tag-categories.json') as Promise<{ default: TagCategoriesData }>;

let tagCategoriesData: TagCategoriesData | null = null;
// Pre-built tag → vector-index map for O(1) classification lookups.
let tagToIdx: Map<string, number> | null = null;

export async function initTagCategoryData(): Promise<void> {
    if (tagCategoriesData) return;
    try {
        const module = await tagCategoriesLoad();
        tagCategoriesData = module.default;
        tagToIdx = new Map(
            tagCategoriesData.tagVocabulary.map((tag, i) => [tag, i]),
        );
    } catch {
        // File may not exist yet (compute-archetypes.ts not run, or older run).
        tagCategoriesData = null;
        tagToIdx = null;
    }
}

export function getTagCategoryDefinitions(): TagCategoryDefinition[] {
    return tagCategoriesData?.categories ?? [];
}

/**
 * Returns the pre-built tag → vector-index map for use in scoring loops.
 * Returns null if tag data has not been loaded yet.
 */
export function getTagToIdx(): Map<string, number> | null {
    return tagToIdx;
}

/**
 * Classify a cube by comparing its tag-frequency profile to the category centroids.
 *
 * The profile is built by iterating each cube card's `tags` array and counting
 * occurrences of each vocabulary tag. Counts are normalized by the total number
 * of (card, tag) pairs so cubes of different sizes produce comparable vectors.
 *
 * Returns null if tag category data hasn't been loaded, the cube has no cards,
 * or the cube has insufficient tag coverage.
 */
export function classifyCubeByTags(cards: CubeCard[]): TagCategoryDefinition | null {
    if (!tagCategoriesData || !tagToIdx || cards.length === 0) return null;

    const { categories } = tagCategoriesData;
    const vocabSize = tagCategoriesData.tagVocabulary.length;

    const profile = new Array<number>(vocabSize).fill(0);
    let totalTagPairs = 0;

    for (const card of cards) {
        if (!card.tags) continue;
        for (const tag of card.tags) {
            const idx = tagToIdx.get(tag);
            if (idx !== undefined) {
                profile[idx]++;
                totalTagPairs++;
            }
        }
    }

    if (totalTagPairs === 0) return null;
    for (let j = 0; j < vocabSize; j++) profile[j] /= totalTagPairs;

    // Find nearest category centroid by squared L2 distance.
    let minDist = Infinity;
    let nearest: TagCategoryDefinition | null = null;

    for (const category of categories) {
        let d = 0;
        for (let j = 0; j < vocabSize; j++) {
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
