import type { CardTrend } from '../../analysis/cards';
import type { Ms } from '../../types';

export interface CardTimelineRow {
    cubeId: string;
    name: string;
    owner: string;
    copiesLatest: number;
    firstSeen: Ms;
    lastSeen: Ms;
    current: boolean;
    addedInWindow: boolean;
    removedInWindow: boolean;
}

// One row per cube that ever held copy 1 of this card; firstSeen/lastSeen/current are tracked off copy 1 only.
export function buildCardTimeline(
    trends: CardTrend[],
    samples: Ms[],
    cubes: { id: string; name: string; owner: string }[],
): CardTimelineRow[] {
    const copy1 = trends.find((t) => t.copy === 1);
    if (!copy1 || samples.length === 0) {
        return [];
    }
    const last = samples.length - 1;
    const rows: CardTimelineRow[] = [];

    for (let c = 0; c < cubes.length; c++) {
        let firstSeen: Ms | null = null;
        let lastSeen: Ms | null = null;
        const presentAtFirst = copy1.cubesPresent[0]?.includes(c) ?? false;
        const presentAtLast = copy1.cubesPresent[last]?.includes(c) ?? false;

        for (let k = 0; k < samples.length; k++) {
            if (copy1.cubesPresent[k]?.includes(c)) {
                firstSeen ??= samples[k];
                lastSeen = samples[k];
            }
        }

        if (firstSeen === null || lastSeen === null) {
            continue;
        }

        const copiesLatest = trends.reduce((sum, trend) => (
            sum + (trend.cubesPresent[last]?.includes(c) ? 1 : 0)
        ), 0);

        rows.push({
            cubeId: cubes[c].id,
            name: cubes[c].name,
            owner: cubes[c].owner,
            copiesLatest,
            firstSeen,
            lastSeen,
            current: presentAtLast,
            addedInWindow: !presentAtFirst,
            removedInWindow: !presentAtLast,
        });
    }

    return rows;
}
