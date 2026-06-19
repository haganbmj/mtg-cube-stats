import { describe, it, expect } from 'vitest';
import { parseHash, serializeHash } from './useHashRouter';

describe('parseHash', () => {
    it('parses cubes from hash', () => {
        const state = parseHash('#/overview?cubes=abc,def');
        expect(state.cubes).toEqual(['abc', 'def']);
    });
});

describe('serializeHash', () => {
    const baseState = {
        tab: 'overview',
        preset: null,
        cubes: [] as string[],
        presetAdd: [] as string[],
        presetRemove: [] as string[],
        q: '',
        order: null,
        direction: null,
        compareA: null,
        compareB: null,
        allCards: false,
    };

    it('does not include hidden param', () => {
        const hash = serializeHash(baseState);
        expect(hash).not.toContain('hidden=');
    });

    it('serializes cubes', () => {
        const hash = serializeHash({ ...baseState, cubes: ['abc', 'def'] });
        expect(hash).toContain('cubes=abc%2Cdef');
    });
});
