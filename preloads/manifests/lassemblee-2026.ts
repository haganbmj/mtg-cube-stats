import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'lassemblee-2026',
    label: "Cube l'Assemblée 2026",
    description: 'Auxerre, France - August 22-23, 2026',
    icon: 'https://pincecrane.fr/cube-assemblee-2026-logo.webp',
    links: [
        { label: 'Event Website', url: 'https://pincecrane.fr', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/wAKjaQnurr', type: 'discord' },
        { label: 'Signup', url: 'https://www.helloasso.com/associations/le-pincecrane/evenements/cube-l-assemblee-2026', type: 'signup' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        'c86ab2cb-0407-451e-a7ed-7667bef582dc', // Le Starter Cube - JiRock
        '6330715ccc4dd36c7b0ee545', // The Un-cube - Bambi
        '3868c5ab-d0ec-4ea8-8521-4be1d3b074d8', // The Flood - Androfiel
        'ced0432e-5e85-40f8-8ca5-080939bc6f93', // Horizonless (Boomer) Vintage - Pulp
        '848809ac-fd69-4f5a-9885-2487f705f6ba', // Arabian Nights to Apocalypse - RobinE
        'dd3ebf75-bac3-4ad9-837e-887d98b066d6', // Commander Cube - Milanaarz
        'e8d550d9-b2d8-4087-9417-4e7063c82542', // Cube Orni - Vanct
        '2388eab8-912d-48bf-926e-03debde27962', // Duskmourn: Director's Cut - JackThePenguin
        'a84c039f-1f14-448e-ab86-4c0ea465c2ce', // Modern Horizons 1 Remastered - devlain
        '02971c22-1c8a-4abd-8249-23ecaf603785', // Le Chill Bulk Cube - gonxfreecs
        '637b9e8cd7d17f14ab27f4c9', // Synergy Peasant Cube - roro4796
        '3645c65b-14ba-4f14-9a74-82e69153d3f0', // Tarkir Peasant Cube - 4_Rtms
        '60c16b958473ef103d299aca', // The Compost Cube - lyserg42
        '82f27ca5-58ff-4874-84da-7f8bc23e2073', // The Legion Cube - SoullessOni
        '958dad8f-ec33-43ee-b0f5-2b4e887e74b4', // The Spellslinging Cube - Pline le Cong
        '5f0d0b49f04f400fce84651c', // Twisted Color Pie - Timothée
    ],
};

export default manifest;
