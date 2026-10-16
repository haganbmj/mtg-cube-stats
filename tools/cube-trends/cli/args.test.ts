import { describe, expect, it } from 'vitest';
import { parseArgs } from './args';

describe('parseArgs', () => {
    it('parses --manifest as a comma-separated list with overrides', () => {
        expect(parseArgs(['--manifest', 'wotc,peasant', '--interval', '1w'])).toEqual({
            manifests: ['wotc', 'peasant'],
            overrides: { interval: '1w' },
        });
    });

    it('parses --all with --include-basics', () => {
        expect(parseArgs(['--all', '--include-basics'])).toEqual({
            manifests: 'all',
            overrides: { includeBasics: true },
        });
    });

    it('throws when neither --manifest nor --all is given', () => {
        expect(() => parseArgs([])).toThrow();
    });
});
