// @vitest-environment node
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeOutputs } from './output';

describe('writeOutputs', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-trends-output-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('writes one json file per key', () => {
        writeOutputs(dir, {
            cards: { cards: [] },
            timeline: { points: [] },
            meta: { manifest: 'wotc' },
        });

        expect(fs.readdirSync(dir).sort()).toEqual(['cards.json', 'meta.json', 'timeline.json']);
    });

    it('creates the directory if it does not exist', () => {
        const nested = path.join(dir, 'nested', 'deep');
        writeOutputs(nested, { meta: { manifest: 'wotc' } });
        expect(fs.existsSync(path.join(nested, 'meta.json'))).toBe(true);
    });

    it('writes meta.json last, so an earlier failure leaves it absent', () => {
        expect(() => writeOutputs(dir, {
            meta: { manifest: 'wotc' },
            timeline: { points: [{ t: NaN }] },
        })).toThrow();
        expect(fs.existsSync(path.join(dir, 'meta.json'))).toBe(false);
    });

    it('converts Maps to plain objects and Sets to arrays instead of emitting {}', () => {
        writeOutputs(dir, {
            cards: {
                cards: [{
                    key: 'bolt',
                    ir: [0.1, 0.2],
                    cubesPresent: new Map([['a', new Set([1, 2])]]),
                }],
            },
        });

        const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8'));
        expect(parsed.cards[0].ir).toEqual([0.1, 0.2]);
        expect(parsed.cards[0].cubesPresent).toEqual({ a: [1, 2] });
    });

    it('throws naming the file and key path when a number is NaN', () => {
        expect(() => writeOutputs(dir, {
            cards: { cards: [{ ir: [0.1, NaN] }] },
        })).toThrow(/cards\.json.*cards\[0\]\.ir\[1\]/);
    });

    it('throws naming the file and key path when a number is Infinity', () => {
        expect(() => writeOutputs(dir, {
            shape: { points: [{ meanMv: Infinity }] },
        })).toThrow(/shape\.json.*points\[0\]\.meanMv/);
    });
});
