import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'stl3',
    label: "St. Louis Cubed 3",
    description: 'Saint Charles, MO - October 24-25, 2026',
    icon: 'https://stl3cu.be/logo.png',
    links: [
        { label: 'Event Website', url: 'https://stl3cu.be', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/NGsGAWwkuG', type: 'discord' },
        { label: 'Signup', url: 'https://www.fantasyshoponline.com/stl3-cube-2026', type: 'signup' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '5fc9e578bada5f7f15feb582', // aquaone
        '9a317aa5-0b40-48d0-8691-c23c7f5a2288', // 100 Black Lotuses
        '12b2535f-0665-4e60-896f-54373ecc4583', // Reject Modernity
    ],
};

export default manifest;
