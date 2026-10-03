import { describe, it, expect } from 'vitest';
import { resolveConfig, DEFAULT_CONFIG } from './config';

describe('resolveConfig', () => {
    it('returns the default config for wotc', () => {
        expect(resolveConfig('wotc')).toEqual(DEFAULT_CONFIG);
    });

    it('applies the peasant manifest override', () => {
        expect(resolveConfig('peasant').eligibility).toBe('firstCommonOrUncommon');
    });

    it('deep-merges overrides on top of manifest defaults', () => {
        const config = resolveConfig('peasant', { interval: '1w', thresholds: { setMinCards: 5 } as any });
        expect(config.interval).toBe('1w');
        expect(config.thresholds.setMinCards).toBe(5);
        expect(config.thresholds.momentumMinPeakIr).toBe(0.05);
    });

    it('does not mutate DEFAULT_CONFIG', () => {
        const config = resolveConfig('peasant', { thresholds: { setMinCards: 5 } as any });
        config.consensus.exclude.push('x');
        config.thresholds.setMinCards = 999;
        expect(DEFAULT_CONFIG.consensus.exclude).toEqual([]);
        expect(DEFAULT_CONFIG.thresholds.setMinCards).toBe(2);
    });
});
