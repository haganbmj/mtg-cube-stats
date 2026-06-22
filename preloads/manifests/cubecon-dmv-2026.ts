import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-dmv-2026',
    label: 'CubeCon DMV 2026',
    description: 'Pikesville, MD - July 11-12, 2026',
    icon: 'https://dmvlegacyleague.com/assets/events/cubecon/dmvll-logo-FINAL-vectored.png',
    links: [
        { label: 'Event Website', url: 'https://dmvlegacyleague.com/events', type: 'website' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 3 },
    cubes: [
        '5f3ea09b9a900d0f8bfd9f13', // Bizarro World
        '5f31f4c17649e8102a9023a0', // Midrange Hipster
        '5fd138969c0782105bfa7c6e', // The Draft Chaff Cube
        '5f3d9de37440640ffe566247', // Old: The Cube That Makes You Old
        '61e6b4fee9cb550ffa2bdc85', // Jarvis 360 'Yube'
        'c1ddab12-b87c-4e6c-9279-0ff955abc803', // Fertile Soil
        'a1353f17-4629-4184-bca3-9107bfcc948c', // Out of the Dead Land
        '089b959d-b679-4dd8-a816-ab03dc553111', // Seventeen Samurai
        '549acfea-4793-41ca-b171-b7ae89a9903b', // A Brooding Saga
        'bd9bfd7d-12a1-4442-9b20-5ffee6e8d7ce', // World Championship Museum (96-04)
        '83b68fda-6731-4110-8f50-d5772f6250fc', // Kamigawa-Time Spiral Museum: Golden Age of Standard
        'a8e60d85-38ff-45e1-b5bd-b598438ad562', // Everywhere Cube
        '6e648d7f-f39e-4f69-bdda-8d67cfa13cb3', // The Unsleeved Cube
        'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37', // 100 Ornithopters
        'ec2a20db-4131-4dcc-8e94-4539db2fc49a', // Take Five
        '5dc09316845516168633e492', // Regular Cube
        '5f5d768ced6023105164a65f', // Turbo Cube
        'f907f0a5-8e95-474a-a879-6cced27aaeb3', // The Middle School
        '5fae85ff8459ff65ae3572c3', // Reading Rainbow
        '5ecd72cf4022a8067a2bd959', // Rally The Peasants
        '44c38caf-9209-4ca8-84fb-2ea6ca4cba66', // The Menagerie
        '10749bd4-90cc-4775-bcfb-ed2589fd8dba', // The Post-Anthropocene
        '6076081acecb70104f75e8ae', // The Depleted Lands
        '60a4217fb6771d105f798bc0', // Alatta
        'cddf58df-e482-4a2c-bec3-b0210a0febd3', // Fours to Be Reckoned With
        '55ccb6ef-821e-40b9-be43-f6d426e066cc', // Metabolic Machine
    ],
};

export default manifest;
