import { describe, it, expect } from 'vitest';
import {
    SNAPSHOT_KEY_SEPARATOR,
    isSnapshot,
    snapshotKey,
    parseLoadedKey,
    externalCubeId,
    snapshotDateLabel,
    displayName
} from './Snapshots';

describe('SNAPSHOT_KEY_SEPARATOR', () => {
    it('is the "@" character', () => {
        expect(SNAPSHOT_KEY_SEPARATOR).toBe('@');
    });
});

describe('snapshotKey', () => {
    it('joins baseCubeId and snapshotDate with @', () => {
        expect(snapshotKey('abc123', 1566534018025)).toBe('abc123@1566534018025');
    });
});

describe('parseLoadedKey', () => {
    it('round-trips a composite key', () => {
        const key = snapshotKey('abc123', 1566534018025);
        expect(parseLoadedKey(key)).toEqual({ baseCubeId: 'abc123', snapshotDate: 1566534018025 });
    });

    it('returns only baseCubeId for a plain id', () => {
        expect(parseLoadedKey('abc123')).toEqual({ baseCubeId: 'abc123' });
    });

    it('treats malformed composite (non-numeric date) as a plain id', () => {
        expect(parseLoadedKey('abc@notanumber')).toEqual({ baseCubeId: 'abc@notanumber' });
    });

    it('handles a baseCubeId that itself looks UUID-like', () => {
        const uuid = '5d5f6961-2af6-6a30-f9bb-9b10aaaaaaaa';
        const key = snapshotKey(uuid, 1566534018025);
        expect(parseLoadedKey(key)).toEqual({ baseCubeId: uuid, snapshotDate: 1566534018025 });
    });
});

describe('isSnapshot', () => {
    it('is true when snapshotDate is set', () => {
        expect(isSnapshot({ snapshotDate: 1566534018025 })).toBe(true);
    });

    it('is false when snapshotDate is undefined', () => {
        expect(isSnapshot({})).toBe(false);
    });
});

describe('externalCubeId', () => {
    it('returns baseCubeId when present', () => {
        expect(externalCubeId({ id: 'abc@123', baseCubeId: 'abc' })).toBe('abc');
    });

    it('falls back to id when baseCubeId is undefined', () => {
        expect(externalCubeId({ id: 'abc' })).toBe('abc');
    });
});

describe('snapshotDateLabel', () => {
    it('produces a YYYY-MM-DD string', () => {
        // 2019-08-23T03:00:18.025Z
        expect(snapshotDateLabel(1566534018025)).toBe('2019-08-23');
    });
});

describe('displayName', () => {
    it('returns the bare name for a live cube', () => {
        expect(displayName({ name: 'Vintage Cube' })).toBe('Vintage Cube');
    });

    it('suffixes the snapshot date for a snapshot', () => {
        expect(displayName({ name: 'Vintage Cube', snapshotDate: 1566534018025 }))
            .toBe('Vintage Cube · 2019-08-23');
    });
});
