import { describe, it, expect } from 'vitest';
import { parseQuery } from './CardFilterParser';
import { evaluateCubeFilter } from './CubeFilterEvaluator';

function makeCube(overrides: Record<string, any> = {}): any {
    return {
        id: 'cube-1',
        name: 'Test Cube',
        owner: 'tester',
        stats: {
            totalCards: 540,
            landCards: 90,
            creatureCards: 200,
            newCards: 30,
        },
        ...overrides,
    };
}

const ctx = { cards: [] };

describe('cube size filter aliases', () => {
    it('accepts `size>N`', () => {
        const ast = parseQuery('size>500').ast;
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 540 } }), ctx)).toBe(true);
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 360 } }), ctx)).toBe(false);
    });

    it('accepts `cards>N`', () => {
        const ast = parseQuery('cards>500').ast;
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 540 } }), ctx)).toBe(true);
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 360 } }), ctx)).toBe(false);
    });

    it('accepts `totalcards>N`', () => {
        const ast = parseQuery('totalcards>500').ast;
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 540 } }), ctx)).toBe(true);
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 360 } }), ctx)).toBe(false);
    });

    it('accepts `cubesize>N` (parser-normalized form of `size`)', () => {
        const ast = parseQuery('cubesize>500').ast;
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 540 } }), ctx)).toBe(true);
        expect(evaluateCubeFilter(ast, makeCube({ stats: { totalCards: 360 } }), ctx)).toBe(false);
    });
});
