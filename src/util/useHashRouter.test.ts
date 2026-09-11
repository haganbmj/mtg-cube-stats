import { describe, it, expect } from 'vitest';
import { parseHash, serializeHash, validateCubeSubtab, VALID_CUBE_SUBTABS } from './useHashRouter';

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

describe('cube tab routing', () => {
    it('parseHash extracts cubeId and cubeSubtab', () => {
        const state = parseHash('#/cube?id=abc&sub=list&q=t%3Acreature');
        expect(state.tab).toBe('cube');
        expect(state.cubeId).toBe('abc');
        expect(state.cubeSubtab).toBe('list');
        expect(state.q).toBe('t:creature');
    });

    it('parseHash returns null cubeId/cubeSubtab when absent', () => {
        const state = parseHash('#/cube');
        expect(state.cubeId).toBeNull();
        expect(state.cubeSubtab).toBeNull();
    });

    it('parseHash accepts unencoded @ in cubeId (snapshot key)', () => {
        const state = parseHash('#/cube?id=abc@1566534018025');
        expect(state.cubeId).toBe('abc@1566534018025');
    });

    it('parseHash accepts URL-encoded @ in cubeId (snapshot key)', () => {
        const state = parseHash('#/cube?id=abc%401566534018025');
        expect(state.cubeId).toBe('abc@1566534018025');
    });

    it('serializeHash writes id and sub only when tab is cube', () => {
        const base = {
            tab: 'overview',
            preset: null,
            cubes: [],
            presetAdd: [],
            presetRemove: [],
            q: '',
            order: null,
            direction: null,
            compareA: null,
            compareB: null,
            allCards: false,
            cubeId: 'abc',
            cubeSubtab: 'list',
        };
        expect(serializeHash(base)).toBe('#/overview');
        expect(serializeHash({ ...base, tab: 'cube' })).toBe('#/cube?id=abc&sub=list');
    });

    it('serializeHash omits sub when it equals the default (details)', () => {
        const state = {
            tab: 'cube',
            preset: null,
            cubes: [],
            presetAdd: [],
            presetRemove: [],
            q: '',
            order: null,
            direction: null,
            compareA: null,
            compareB: null,
            allCards: false,
            cubeId: 'abc',
            cubeSubtab: 'details',
        };
        expect(serializeHash(state)).toBe('#/cube?id=abc');
    });

    it('round-trips a full cube tab URL', () => {
        const url = '#/cube?id=abc@1566534018025&sub=tokens&q=t%3Acreature';
        const parsed = parseHash(url);
        const reserialized = serializeHash(parsed);
        expect(parseHash(reserialized)).toEqual(parsed);
    });

    it('validateCubeSubtab returns the value when valid', () => {
        for (const name of VALID_CUBE_SUBTABS) {
            expect(validateCubeSubtab(name)).toBe(name);
        }
    });

    it('validateCubeSubtab returns null for unknown or null values', () => {
        expect(validateCubeSubtab('bogus')).toBeNull();
        expect(validateCubeSubtab(null)).toBeNull();
        expect(validateCubeSubtab('')).toBeNull();
    });
});
