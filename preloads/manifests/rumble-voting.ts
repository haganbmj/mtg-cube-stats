import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'rumble-voting',
    label: "Benevolent Rumble (Voting)",
    description: 'Philadelphia, PA - December 12-13, 2026',
    icon: 'https://www.benevolentrumble.com/img/logo.png',
    links: [
        { label: 'Event Website', url: 'https://www.benevolentrumble.com/', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/UaWB3QP5pU', type: 'discord' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '9d8a18e7-a1d3-466e-9e1b-35758dd3fb1c',
        '62eee89b3106370bdfeffdb2',
        'a3036e3e-fa53-47bd-b56a-608c12680036',
        '74a0bbe2-dcc1-4b4e-96f0-840dc4de3b86',
        '63dc64717231e90f67eb5ab6',
        '2bb774c3-53ee-4345-9a51-134eeb847802',
        '2004b39e-7e7a-4dbc-97a4-b92ae6eba7e8',
        'ef27bbc1-926c-406d-9a54-a26bf096a90b',
        'c4d27c11-8886-4218-98b8-1ab976f76755',
        '13720768-4ddd-4a1a-8e85-0f4346d663a1',
        'b6163961-5af6-40e2-ada2-9c89a68cd879',
        '99338a96-ed46-4644-9e0b-decdc1700369',
        'e6350388-effe-463f-8bc5-76bc99ba6e98',
        '6a2d9c93-80cc-4aa5-8c7b-4349e1e556dd',
        'deb22909-f628-41d3-8b6a-78cf17f0b663',
        'de4db273-39b1-4cbf-b5b4-c9625bfcec7f',
    ],
};

export default manifest;
