import type { Ms } from '../types';
import type { Panel } from './panel';

export interface DiffEvent {
    cubeId: string;
    date: Ms;
    type: 'add' | 'remove';
    key: string;
    fromRevision: string;
    toRevision: string;
}

export function computeDiffs(panel: Panel): DiffEvent[] {
    const events: DiffEvent[] = [];

    panel.grid.forEach((row, cubeIdx) => {
        const cubeId = panel.cubes[cubeIdx].id;
        const ids = [...new Set(row.filter((id): id is string => id !== null))];
        ids.sort((a, b) => panel.revisions.get(a)!.date - panel.revisions.get(b)!.date);

        for (let i = 1; i < ids.length; i++) {
            const prev = panel.revisions.get(ids[i - 1])!;
            const curr = panel.revisions.get(ids[i])!;

            for (const key of curr.cards) {
                if (!prev.cards.has(key)) {
                    events.push({ cubeId, date: curr.date, type: 'add', key, fromRevision: prev.id, toRevision: curr.id });
                }
            }
            for (const key of prev.cards) {
                if (!curr.cards.has(key)) {
                    events.push({ cubeId, date: curr.date, type: 'remove', key, fromRevision: prev.id, toRevision: curr.id });
                }
            }
        }
    });

    events.sort((a, b) =>
        a.date - b.date ||
        a.cubeId.localeCompare(b.cubeId) ||
        a.type.localeCompare(b.type) ||
        a.key.localeCompare(b.key),
    );

    return events;
}
