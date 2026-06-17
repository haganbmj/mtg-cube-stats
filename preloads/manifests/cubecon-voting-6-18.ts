import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-voting-6-18',
    label: 'CubeCon 2026 Sudden Death (Thu 6/18)',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Voting', url: 'https://cubecon.org/vote', type: 'voting' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '773dac30-0290-4c10-b140-530dc856d26b', // Adam's Ethical Synergy Cube
        '1daac6ea-813b-464c-8a84-b42d5bfa0345', // The Peasant Signpost Maze
        '4f131833-035d-48a2-bcf7-db23cb3633ee', // Daydreaming
        'ae9f493b-b6c8-4a73-9c09-35d9010e2a42', // The Trinket Cube
        'c87a14f1-d924-4777-9d12-5c50ee9b1ac6', // Samp's Arena Cube
        'd7da9efa-55fd-422e-973a-e2ad8cbf65df', // MV:1
        '3e1e506d-c1ec-4002-8879-6ea4af066ea1', // One from Everything
        'd5a5344f-7060-4c2a-a861-1d2ace71d673', // Six-Colored Calamity
    ],
};

export default manifest;
