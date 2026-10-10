import type { CardTrend } from '../../analysis/cards';
import type { Ms } from '../../types';

export interface CardTimelineRow {
    cubeId: string;
    name: string;
    owner: string;
    firstSeen: Ms;
    lastSeen: Ms;
    current: boolean;
    addedInWindow: boolean;
    removedInWindow: boolean;
}

// One row per cube that ever held this card.
export function buildCardTimeline(
    trend: CardTrend,
    samples: Ms[],
    cubes: { id: string; name: string; owner: string }[],
): CardTimelineRow[] {
    if (samples.length === 0) {
        return [];
    }
    const last = samples.length - 1;
    const rows: CardTimelineRow[] = [];

    for (let c = 0; c < cubes.length; c++) {
        let firstSeen: Ms | null = null;
        let lastSeen: Ms | null = null;
        const presentAtFirst = trend.cubesPresent[0]?.includes(c) ?? false;
        const presentAtLast = trend.cubesPresent[last]?.includes(c) ?? false;

        for (let k = 0; k < samples.length; k++) {
            if (trend.cubesPresent[k]?.includes(c)) {
                firstSeen ??= samples[k];
                lastSeen = samples[k];
            }
        }

        if (firstSeen === null || lastSeen === null) {
            continue;
        }

        rows.push({
            cubeId: cubes[c].id,
            name: cubes[c].name,
            owner: cubes[c].owner,
            firstSeen,
            lastSeen,
            current: presentAtLast,
            addedInWindow: !presentAtFirst,
            removedInWindow: !presentAtLast,
        });
    }

    return rows;
}
