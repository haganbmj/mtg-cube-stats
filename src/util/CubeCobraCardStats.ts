import { ref } from 'vue';
import { loadJsonAsset, registerKnownAssetUrl } from './AssetCache';
import cardStatsUrl from '../../data/cubecobra-card-stats.json?url';

export interface CardStats {
    elo: number;
    popularity: number;
    cubeCount: number;
    pickCount: number;
}

registerKnownAssetUrl(cardStatsUrl);

let cardStatsMap: Record<string, CardStats> | null = null;
let initPromise: Promise<void> | null = null;

/** Reactive flag — true once CubeCobra card stats have loaded. */
export const cardStatsReady = ref(false);

export function initCardStats(): Promise<void> {
    if (!initPromise) initPromise = doInit();
    return initPromise;
}

async function doInit(): Promise<void> {
    try {
        cardStatsMap = await loadJsonAsset<Record<string, CardStats>>(cardStatsUrl, 'cardStats');
        cardStatsReady.value = true;
        console.log(`Loaded CubeCobra card stats (${Object.keys(cardStatsMap).length} cards)`);
    } catch {
        console.warn('CubeCobra card stats not available — elo/popularity will require loaded cubes.');
        cardStatsMap = null;
    }
}

/** Look up CubeCobra stats for a card by oracle ID. Returns undefined if data not loaded or card not found. */
export function getCardStats(oracleId: string): CardStats | undefined {
    return cardStatsMap?.[oracleId];
}
