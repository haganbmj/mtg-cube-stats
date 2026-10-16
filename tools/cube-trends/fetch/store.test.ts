// @vitest-environment node
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CubeIndex, CompactRevision } from '../types';
import { createCacheStore } from './store';

function makeIndex(cubeId: string): CubeIndex {
    return {
        cubeId,
        coverage: [{ id: 'rev1', from: 1000, to: 2000 }],
        createdAfter: null,
        gaps: [],
        missing: false,
        fetchedAt: 12345,
    };
}

function makeRevision(changelogId: string): CompactRevision {
    return {
        id: 'cube1',
        changelog: { id: changelogId, date: 1000 },
        cards: { mainboard: [] },
    };
}

describe('createCacheStore', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trends-store-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('round-trips an index', () => {
        const store = createCacheStore(dir);
        const index = makeIndex('cube1');

        expect(store.readIndex('cube1')).toBeNull();
        store.writeIndex(index);

        expect(store.readIndex('cube1')).toEqual(index);
    });

    it('round-trips a revision', () => {
        const store = createCacheStore(dir);
        const rev = makeRevision('rev1');

        expect(store.hasRevision('cube1', 'rev1')).toBe(false);
        store.writeRevision('cube1', rev);

        expect(store.hasRevision('cube1', 'rev1')).toBe(true);
        expect(store.readRevision('cube1', 'rev1')).toEqual(rev);
    });

    it('does not overwrite an existing revision', () => {
        const store = createCacheStore(dir);
        const rev = makeRevision('rev1');
        store.writeRevision('cube1', rev);

        const changed: CompactRevision = { ...rev, cards: { mainboard: [{ cardID: 'new' }] } };
        store.writeRevision('cube1', changed);

        expect(store.readRevision('cube1', 'rev1')).toEqual(rev);
    });

    it('rejects path-unsafe cube and revision ids', () => {
        const store = createCacheStore(dir);
        const rev = makeRevision('../x');

        expect(() => store.readIndex('../x')).toThrow();
        expect(() => store.writeRevision('a/b', makeRevision('rev1'))).toThrow();
        expect(() => store.writeRevision('cube1', rev)).toThrow();
    });
});
