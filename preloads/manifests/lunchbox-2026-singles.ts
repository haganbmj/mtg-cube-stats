import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'lunchbox-2026-singles',
    label: 'Lunchbox 2026 (Singles)',
    description: 'Baltimore, MD - November 7-8, 2026',
    icon: 'https://givebutter.s3.amazonaws.com/media/SPeSJxLwzuaLSd3TrJaDZ9oGp2CkzYEj5T7Ucfxk.png',
    links: [
        { label: 'Event Website', url: 'https://givebutter.com/lunch-box2', type: 'website' },
        { label: 'Fundraiser', url: 'https://givebutter.com/Lunchbox-BoP/', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/3tMUmwBrru', type: 'discord' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 3 },
    cubes: [
        '549eb6df-e390-4eb3-895d-f1e1cac77f7b',
        '27227872-7676-4df8-bc04-4c32ddc7924d',
        '5d5f69612af66a30f9bb9b10',
        '87f695d4-ca23-4827-b4d2-b3db65c7fe35',
        'd4119cd5-a4da-4e79-af47-57e6e115b4a5',
        'f1e824dc-7c7a-43ef-b013-679b290d0ad8',
        'd5c56175-4e10-4e41-9e4e-08fc01439c4b',
        'b58fe8af-edd5-43c5-ba77-3dc81748d669',
        '5ffe613e7a7e7c106ed78b03',
        'ed2c1eb1-1009-4ae2-932b-9235c3a1b3d3',
        '31f73b71-78fc-46a9-8670-4cc1cd2a1cda',
        '5e0d1d94c652dc52d905b373',
    ],
};

export default manifest;
