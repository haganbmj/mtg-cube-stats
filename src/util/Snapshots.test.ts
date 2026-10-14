import { describe, it, expect } from 'vitest';
import {
    SNAPSHOT_KEY_SEPARATOR,
    isSnapshot,
    snapshotKey,
    parseLoadedKey,
    isPlausibleTimestamp,
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

    it('treats a non-timestamp suffix as a changelog id', () => {
        expect(parseLoadedKey('abc@f47ac10b-58cc-4372-a567-0e02b2c3d479'))
            .toEqual({ baseCubeId: 'abc', changelogId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
    });

    it('treats a digit-leading uuid as a changelog id', () => {
        expect(parseLoadedKey('abc@1566534018025-4372-a567-0e02b2c3d479'))
            .toEqual({ baseCubeId: 'abc', changelogId: '1566534018025-4372-a567-0e02b2c3d479' });
    });

    it('treats an all-digit 24-char ObjectId as a changelog id', () => {
        expect(parseLoadedKey('abc@123456789012345678901234'))
            .toEqual({ baseCubeId: 'abc', changelogId: '123456789012345678901234' });
    });

    it('treats an all-digit value outside the plausible range as a changelog id', () => {
        expect(parseLoadedKey('abc@12345')).toEqual({ baseCubeId: 'abc', changelogId: '12345' });
        expect(parseLoadedKey('abc@9999999999999')).toEqual({ baseCubeId: 'abc', changelogId: '9999999999999' });
    });

    it('treats an empty or invalid suffix as a plain id', () => {
        expect(parseLoadedKey('abc@')).toEqual({ baseCubeId: 'abc@' });
        expect(parseLoadedKey('abc@has space')).toEqual({ baseCubeId: 'abc@has space' });
    });

    it('handles a baseCubeId that itself looks UUID-like', () => {
        const uuid = '5d5f6961-2af6-6a30-f9bb-9b10aaaaaaaa';
        const key = snapshotKey(uuid, 1566534018025);
        expect(parseLoadedKey(key)).toEqual({ baseCubeId: uuid, snapshotDate: 1566534018025 });
    });
});

describe('isPlausibleTimestamp', () => {
    const now = Date.UTC(2026, 9, 13);

    it('accepts ms timestamps between 2015 and shortly after now', () => {
        expect(isPlausibleTimestamp('1566534018025', now)).toBe(true);
        expect(isPlausibleTimestamp(String(now), now)).toBe(true);
    });

    it('rejects values before 2015 or far in the future', () => {
        expect(isPlausibleTimestamp('1000', now)).toBe(false);
        expect(isPlausibleTimestamp(String(now + 7 * 24 * 60 * 60 * 1000), now)).toBe(false);
    });

    it('rejects non-digit and over-long values', () => {
        expect(isPlausibleTimestamp('15665340180a5', now)).toBe(false);
        expect(isPlausibleTimestamp('15665340180250', now)).toBe(false);
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
