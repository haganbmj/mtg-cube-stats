import { describe, it, expect } from 'vitest';
import { parseHash, serializeHash } from './useHashRouter';

describe('parseHash — hidden field', () => {
    it('defaults to an empty array when hidden is absent', () => {
        expect(parseHash('#/overview').hidden).toEqual([]);
    });

    it('parses a comma-separated hidden list', () => {
        const state = parseHash('#/overview?hidden=abc%401000,xyz%402000');
        expect(state.hidden).toEqual(['abc@1000', 'xyz@2000']);
    });

    it('parses hidden alongside cubes and preset', () => {
        const state = parseHash('#/overview?cubes=abc,def&hidden=abc%401000');
        expect(state.cubes).toEqual(['abc', 'def']);
        expect(state.hidden).toEqual(['abc@1000']);
    });

    it('ignores empty entries in hidden', () => {
        const state = parseHash('#/overview?hidden=abc%401000,,xyz%402000');
        expect(state.hidden).toEqual(['abc@1000', 'xyz@2000']);
    });
});

describe('serializeHash — hidden field', () => {
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
        hidden: [] as string[],
    };

    it('omits hidden when empty', () => {
        const hash = serializeHash(baseState);
        expect(hash).not.toContain('hidden=');
    });

    it('emits hidden when non-empty', () => {
        const hash = serializeHash({ ...baseState, hidden: ['abc@1000', 'xyz@2000'] });
        expect(hash).toContain('hidden=abc%401000%2Cxyz%402000');
    });

    it('round-trips a composite hidden id without losing the @', () => {
        const original = { ...baseState, hidden: ['abc@1566534018025'] };
        const hash = serializeHash(original);
        const reparsed = parseHash(hash);
        expect(reparsed.hidden).toEqual(['abc@1566534018025']);
    });
});
