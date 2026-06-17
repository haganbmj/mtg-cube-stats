import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-voting-6-16',
    label: 'CubeCon 2026 Sudden Death (Tue 6/16)',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Voting', url: 'https://cubecon.org/vote', type: 'voting' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '472863a8-6cf1-4234-8748-a0d8951f016b', // Design Mistake Retirement Home
        '03e496c1-3fb2-4437-9004-07f727256de6', // Gingercube
        '8f2e2e54-88b0-42f7-af64-943760d9d0e7', // Mazes in the Desert
        '50cb0d25-4bc9-43c8-b517-26f1f3a55828', // Cream City Cube
        'acf0bb88-6a3d-4990-af63-026e8e5f3caf', // game zones cube
        '54cbb003-f636-4eed-bfeb-a5dd76516dd9', // The Fish Tank
        'a374e4bb-ad6e-4bf6-b9a7-5eadfce5c13b', // What if K'rrik were real?
        '555f0bbc-c056-4c2f-b103-106bcfddc152', // The Promised Land CubeCon Edition: An Oasis Cube
    ],
};

export default manifest;
