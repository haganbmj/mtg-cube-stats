import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'inland-northwest-2026',
    label: 'Inland Northwest Cube Fest 2026',
    description: 'Spokane, WA - October 10-11, 2026',
    icon: 'https://i.imgur.com/DnsGAdE.png',
    links: [
        { label: 'Event Website', url: 'https://hedron.network/events/inw2026/purchase', type: 'website' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 3 },
    cubes: [
        '6080f4934382111055b83c78',
        '61c8c04724a1d3102914678e',
        '3e9e0765-8ee4-4528-8f8c-8fd9657bec19',
        '3e1e506d-c1ec-4002-8879-6ea4af066ea1',
        '8e658263-6a35-4000-8e92-5258d3ab9ac4',
        '79b5dcf9-2e24-4a50-8221-53b66be5a7e6',
        'a88a0418-0a55-457a-92f9-cdf44d362750',
        'ec2a20db-4131-4dcc-8e94-4539db2fc49a',
        // Plus 2 undisclosed.
    ],
};

export default manifest;
