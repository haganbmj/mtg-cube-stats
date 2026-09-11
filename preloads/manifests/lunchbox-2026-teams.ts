import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'lunchbox-2026-teams',
    label: 'Lunchbox 2026 (Teams)',
    description: 'Baltimore, MD - November 7-8, 2026',
    icon: 'https://givebutter.s3.amazonaws.com/media/SPeSJxLwzuaLSd3TrJaDZ9oGp2CkzYEj5T7Ucfxk.png',
    links: [
        { label: 'Event Website', url: 'https://givebutter.com/lunch-box2', type: 'website' },
        { label: 'Fundraiser', url: 'https://givebutter.com/Lunchbox-BoP/', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/3tMUmwBrru', type: 'discord' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 3 },
    cubes: [
        'a0741103-14c3-48dc-9714-7d9edc416ea2',
        '7df87ddf-40f5-4c5b-8de2-e1ce223bddf0',
        '55ccb6ef-821e-40b9-be43-f6d426e066cc',
        '5ffe613e7a7e7c106ed78b03',
        '7cefb710-c68f-4d01-b77f-dc1e6d03c70e',
        '13e2501c-0f94-4fdc-a7c0-ef2b78317200',
        '3e100880-33b5-4040-b222-de42957b07fe',
        'c17b3a8f-a343-449e-9172-8e2d0721a003',
        'a5cc24d9-6290-45f0-92f0-cff0a0adf321',
        'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37',
        '10749bd4-90cc-4775-bcfb-ed2589fd8dba',
        '5bfedf62-b418-4410-8458-71d0f98f191e',
        '6b49897c-b0b8-4934-8a5b-8563a97a9c65',
    ],
};

export default manifest;
