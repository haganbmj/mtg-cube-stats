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
        '041a13ba-b23c-4580-9550-0080b8fe29da', // Starship Troopers
        'f43649bc-b213-4e62-b7d1-68dfb27af966', // The Arti Parti
        '514a9a6f-20a2-4d91-ba90-34fe72aa4de1', // No Mana No Cry
        'afb85eb0-31b4-45c4-b5a9-1f6a0f5a1fae', // Boudican Destruction Horizon
        '07481055-8612-411b-b3cb-a4deca988e95', // Usman
        '37475a24-8f7d-448e-b562-1404e42f390d', // Floor is Lava
        'fc7f96b0-5c44-4f1f-a9bd-cbbb4f5f0c15', // Face Plant
        '2c26979e-028f-4af3-954d-5d79c93990bd', // Flavor Cube
        '48b0aee6-fb17-4656-9123-6bd12ff017b5', // Crumbling
    ],
};

export default manifest;
