import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'rumble',
    label: "Benevolent Rumble",
    description: 'Philadelphia, PA - December 12-13, 2026',
    icon: 'https://www.benevolentrumble.com/img/logo.png',
    links: [
        { label: 'Event Website', url: 'https://www.benevolentrumble.com/', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/UaWB3QP5pU', type: 'discord' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37',
        '549eb6df-e390-4eb3-895d-f1e1cac77f7b',
        'dafb7624-8329-4ac7-af2f-7ad80f94b038',
        'da5af81f-eefb-45cd-a40c-79b30f5477bc',
        'ac5596c7-e210-42ee-b94b-8b7786860322',
        '2e587f1b-7b43-4c03-b933-0006e1282ea7',
        '4687547a-3f8a-48d1-ac10-29f0ed02864d',
        'c17b3a8f-a343-449e-9172-8e2d0721a003',
        '05426587-9751-4292-b1f8-e85c37e74223',
        '60e45ef46d34d9567d6a2946',
        '8e138c2c-0011-4cd0-aead-ac9c50f53939',
        '5e0d1d94c652dc52d905b373',
    ],
};

export default manifest;
