import * as fs from 'fs';
import * as path from 'path';
import type { CubeIndex, CompactRevision } from '../types';

export const DEFAULT_CACHE_DIR = 'tools/cube-trends/cache';

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export interface CacheStore {
    readIndex(cubeId: string): CubeIndex | null;
    writeIndex(index: CubeIndex): void;
    hasRevision(cubeId: string, id: string): boolean;
    readRevision(cubeId: string, id: string): CompactRevision;
    writeRevision(cubeId: string, rev: CompactRevision): void;
}

function assertSafeId(id: string): void {
    if (!SAFE_ID.test(id)) {
        throw new Error(`unsafe id: ${id}`);
    }
}

function writeAtomic(filePath: string, contents: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, contents);
    fs.renameSync(tmpPath, filePath);
}

export function createCacheStore(rootDir: string): CacheStore {
    function indexPath(cubeId: string): string {
        assertSafeId(cubeId);
        return path.join(rootDir, 'index', `${cubeId}.json`);
    }

    function revisionPath(cubeId: string, id: string): string {
        assertSafeId(cubeId);
        assertSafeId(id);
        return path.join(rootDir, 'revisions', cubeId, `${id}.json`);
    }

    return {
        readIndex(cubeId: string): CubeIndex | null {
            const filePath = indexPath(cubeId);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        },

        writeIndex(index: CubeIndex): void {
            writeAtomic(indexPath(index.cubeId), JSON.stringify(index));
        },

        hasRevision(cubeId: string, id: string): boolean {
            return fs.existsSync(revisionPath(cubeId, id));
        },

        readRevision(cubeId: string, id: string): CompactRevision {
            return JSON.parse(fs.readFileSync(revisionPath(cubeId, id), 'utf8'));
        },

        writeRevision(cubeId: string, rev: CompactRevision): void {
            const filePath = revisionPath(cubeId, rev.changelog.id);
            if (fs.existsSync(filePath)) {
                return;
            }
            writeAtomic(filePath, JSON.stringify(rev));
        },
    };
}
