import type { Cube } from '../types';

export const SNAPSHOT_KEY_SEPARATOR = '@';

export function isSnapshot(cube: Pick<Cube, 'snapshotDate'>): boolean {
    return cube.snapshotDate != null;
}

export function snapshotKey(baseCubeId: string, snapshotDate: number): string {
    return `${baseCubeId}${SNAPSHOT_KEY_SEPARATOR}${snapshotDate}`;
}

export function parseLoadedKey(key: string): {
    baseCubeId: string;
    snapshotDate?: number;
} {
    const idx = key.indexOf(SNAPSHOT_KEY_SEPARATOR);
    if (idx === -1) return { baseCubeId: key };
    const baseCubeId = key.slice(0, idx);
    const snapshotDate = Number(key.slice(idx + 1));
    if (!Number.isFinite(snapshotDate)) return { baseCubeId: key };
    return { baseCubeId, snapshotDate };
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
