import { describe, expect, it } from 'vitest';
import { rewriteGlob } from './report';

describe('rewriteGlob', () => {
    it('replaces the output glob with a manifest-scoped path', () => {
        const code = `const modules = import.meta.glob('../output/*/*.json');`;

        expect(rewriteGlob(code, 'wotc')).toBe(`const modules = import.meta.glob('../output/wotc/*.json');`);
    });

    it('throws when the literal glob is absent', () => {
        expect(() => rewriteGlob('const x = 1;', 'wotc')).toThrow(/literal/i);
    });

    it('throws when the manifest name fails validation', () => {
        const code = `import.meta.glob('../output/*/*.json')`;

        expect(() => rewriteGlob(code, '../x')).toThrow(/manifest/i);
    });
});
