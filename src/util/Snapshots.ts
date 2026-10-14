import type { Cube } from '../types';

export const SNAPSHOT_KEY_SEPARATOR = '@';

export function isSnapshot(cube: Pick<Cube, 'snapshotDate'> | null | undefined): boolean {
    return cube != null && cube.snapshotDate != null;
}

export function snapshotKey(baseCubeId: string, snapshotDate: number): string {
    return `${baseCubeId}${SNAPSHOT_KEY_SEPARATOR}${snapshotDate}`;
}

export function parseLoadedKey(key: string): {
    baseCubeId: string;
    snapshotDate?: number;
    changelogId?: string;
} {
    const idx = key.indexOf(SNAPSHOT_KEY_SEPARATOR);
    if (idx === -1) return { baseCubeId: key };
    const baseCubeId = key.slice(0, idx);
    const suffix = key.slice(idx + 1);
    if (isPlausibleTimestamp(suffix)) return { baseCubeId, snapshotDate: Number(suffix) };
    if (CHANGELOG_ID_PATTERN.test(suffix)) return { baseCubeId, changelogId: suffix };
    return { baseCubeId: key };
}

const CHANGELOG_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const MIN_PLAUSIBLE_TIMESTAMP = Date.UTC(2015, 0, 1);
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

// Changelog ids (uuid / ObjectId) may start with digits, so only treat in-range ms epochs as dates.
export function isPlausibleTimestamp(value: string, now: number = Date.now()): boolean {
    if (!/^\d{1,13}$/.test(value)) return false;
    const n = Number(value);
    return n >= MIN_PLAUSIBLE_TIMESTAMP && n <= now + FUTURE_SLACK_MS;
}

export function externalCubeId(cube: Pick<Cube, 'id' | 'baseCubeId'>): string {
    return cube.baseCubeId ?? cube.id;
}

export function snapshotDateLabel(snapshotDate: number): string {
    return new Date(snapshotDate).toISOString().slice(0, 10);
}

export function displayName(cube: Pick<Cube, 'name' | 'snapshotDate'>): string {
    if (cube.snapshotDate == null) return cube.name;
    return `${cube.name} · ${snapshotDateLabel(cube.snapshotDate)}`;
}
