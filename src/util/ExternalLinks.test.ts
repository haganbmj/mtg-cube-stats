import { describe, it, expect } from 'vitest';
import { cubeCobraCubeUrl, cubeCobraUserUrl, hedronCubeUrl, luckyPaperCubeMapUrl, scryfallCardUrl } from './ExternalLinks';

describe('ExternalLinks', () => {
    const cube = { id: 'abc' };
    const snapshot = { id: 'abc@1700000000000', baseCubeId: 'abc' };

    it('links cubes to CubeCobra by id', () => {
        expect(cubeCobraCubeUrl(cube)).toBe('https://cubecobra.com/cube/about/abc');
    });

    it('links snapshots to their base cube, not the snapshot id', () => {
        expect(cubeCobraCubeUrl(snapshot)).toBe('https://cubecobra.com/cube/about/abc');
        expect(hedronCubeUrl(snapshot)).toBe('https://hedron.network/cube-results/?cubeId=abc');
        expect(luckyPaperCubeMapUrl(snapshot)).toBe('https://luckypaper.co/resources/cube-map/?cube=abc');
    });

    it('links owners to their CubeCobra profile', () => {
        expect(cubeCobraUserUrl('owner123')).toBe('https://cubecobra.com/user/view/owner123');
    });

    it('links cards to Scryfall with a lowercased set code', () => {
        expect(scryfallCardUrl({ setCode: 'MH3', collectorNumber: '42' })).toBe('https://scryfall.com/card/mh3/42');
    });
});
