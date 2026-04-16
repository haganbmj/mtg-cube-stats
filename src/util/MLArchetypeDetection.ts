import type { CubeCard } from '../types';

export interface ArchetypeResult {
    name: string;
    count: number;
    cards: string[];
    percentage: string;
}

interface ClusterDefinition {
    id: number;
    label: string;
    cards: { oracleId: string; weight: number; name: string }[];
    memberCount: number;
}

export interface CardClusterAssignment {
    clusterId: number;
    weight: number;
}

interface ArchetypeData {
    embeddingDim: number;
    embeddingSource: string;
    numClusters: number;
    cardPoolSize: number;
    clusters: ClusterDefinition[];
    cardClusters: Record<string, CardClusterAssignment[]>;
}

const archetypeLoad = () => import('../../data/cubecobra-archetypes.json') as Promise<{ default: ArchetypeData }>;

let archetypeData: ArchetypeData | null = null;

export async function initArchetypeData(): Promise<void> {
    if (archetypeData) return;
    console.time('Loading archetype data');
    const module = await archetypeLoad();
    archetypeData = module.default;
    console.timeEnd('Loading archetype data');
}

/**
 * Returns the raw cardClusters map for use by other utilities (e.g. cube classification).
 * Returns null if archetype data has not yet been loaded.
 */
export function archetypeCardClusters(): Record<string, CardClusterAssignment[]> | null {
    return archetypeData?.cardClusters ?? null;
}

/**
 * Detects which clusters a single card belongs to based on ML clustering data.
 * Returns the label (representative card names) of each assigned cluster.
 */
export function detectCardArchetypes(card: CubeCard): string[] {
    if (!archetypeData) return [];

    const assignments = archetypeData.cardClusters[card.oracleId];
    if (!assignments) return [];

    return assignments.map(a => {
        const cluster = archetypeData!.clusters.find(c => c.id === a.clusterId);
        return cluster ? `Cluster ${cluster.id + 1}` : '';
    }).filter(Boolean);
}

/**
 * Detects and scores card clusters present in a cube.
 *
 * For each cluster, counts how many of its member cards are present in the cube
 * and computes a weighted score (cards closer to the cluster centroid contribute more).
 */
export function detectCubeArchetypes(cards: CubeCard[]): ArchetypeResult[] {
    if (!archetypeData) return [];

    const cubeCardNames = new Map(cards.map(c => [c.oracleId, c.name ?? 'Unknown']));

    // Build cluster → card list by iterating each cube card's assignments.
    // This allows a card to count toward multiple clusters (primary + secondary).
    const clusterCardMap = new Map<number, string[]>();
    for (const card of cards) {
        const assignments = archetypeData.cardClusters[card.oracleId];
        if (!assignments) continue;
        for (const assignment of assignments) {
            let list = clusterCardMap.get(assignment.clusterId);
            if (!list) {
                list = [];
                clusterCardMap.set(assignment.clusterId, list);
            }
            list.push(cubeCardNames.get(card.oracleId) ?? card.oracleId);
        }
    }

    const results: ArchetypeResult[] = [];

    for (const cluster of archetypeData.clusters) {
        const matchingCards = clusterCardMap.get(cluster.id);
        if (!matchingCards || matchingCards.length === 0) continue;

        results.push({
            name: `Cluster ${cluster.id + 1}`,
            count: matchingCards.length,
            cards: matchingCards,
            percentage: ((matchingCards.length / cards.length) * 100).toFixed(1),
        });
    }

    results.sort((a, b) => b.count - a.count);
    return results;
}

/**
 * Get the full list of ML-discovered clusters (for reference display).
 */
export function getArchetypeDefinitions(): ClusterDefinition[] {
    return archetypeData?.clusters ?? [];
}

/**
 * Get a single cluster by its ID.
 */
export function getClusterById(id: number): ClusterDefinition | undefined {
    return archetypeData?.clusters.find(c => c.id === id);
}

/**
 * Get the cluster assignments for a specific card by Oracle ID.
 * Returns an empty array if the card has no cluster data.
 */
export function getCardClusterAssignments(oracleId: string): CardClusterAssignment[] {
    return archetypeData?.cardClusters[oracleId] ?? [];
}
