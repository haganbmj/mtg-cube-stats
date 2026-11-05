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
        'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37',
        '5bfedf62-b418-4410-8458-71d0f98f191e',
        '81563e22-fc5e-4922-b1b1-d0f6ddac6b3f',
        '9eaba120-87e5-45e8-b4dc-2248784e4852',
        'd87475a9-70dc-4792-bc54-71674b249010',
        '0d70e0a4-0897-4c4c-be32-026a0e31a6aa',
        '33e73699-4b9f-46e0-bd56-7944c8e5cfd3',
        '27f3fd74-eecc-43c3-aac3-9443b2c907de',
        '636f4d85-c1d6-4bc8-b0fc-b8cc91f88b5c',
        '6b49897c-b0b8-4934-8a5b-8563a97a9c65',
        'ab092396-1ef3-42b0-9aa0-dd1608601f00',
        'c19f79a1-84f8-47a2-8307-2ecab056d087',
        'f1752901-c217-406e-93d2-7e0e8aa8b5e7',
    ],
};

export default manifest;
