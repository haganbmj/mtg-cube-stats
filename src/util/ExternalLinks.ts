import type { Cube, CubeCard } from '../types';
import { externalCubeId } from './Snapshots';

// URLs are built here rather than inline in templates: vue-tsc mangles `//` inside
// template-literal bindings on components, which breaks type-checking of the slot.

type CubeRef = Pick<Cube, 'id' | 'baseCubeId'>;

export function cubeCobraCubeUrl(cube: CubeRef): string {
    return `https://cubecobra.com/cube/about/${externalCubeId(cube)}`;
}

export function cubeCobraUserUrl(ownerId: string | undefined): string {
    return `https://cubecobra.com/user/view/${ownerId}`;
}

export function hedronCubeUrl(cube: CubeRef): string {
    return `https://hedron.network/cube-results/?cubeId=${externalCubeId(cube)}`;
}

export function luckyPaperCubeMapUrl(cube: CubeRef): string {
    return `https://luckypaper.co/resources/cube-map/?cube=${externalCubeId(cube)}`;
}

export function scryfallCardUrl(card: Pick<CubeCard, 'setCode' | 'collectorNumber'>): string {
    return `https://scryfall.com/card/${card.setCode?.toLowerCase()}/${card.collectorNumber}`;
}
