import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-voting-6-17',
    label: 'CubeCon 2026 Sudden Death (Wed 6/17)',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Voting', url: 'https://cubecon.org/vote', type: 'voting' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '2dcf6fff-76c0-48bf-bc40-bd7ccb87b15d', // The Graveyard Shift
        '61483627-042e-4a6c-b1ba-5aae1896d3d1', // The Mono Red Cube
        '5f3d9de37440640ffe566247', // Old: The Cube That Makes You Old
        '51eafd69-b474-4aa7-a538-165aca1d41ec', // The Carlsbad Cube
        'e9ef27a5-d16e-4fec-8414-204a20177d1d', // The Tundra (360)
        '62e12d83-0030-4fef-b661-a277135bfe02', // Spy Games
        'e7e1e793-f89b-4db8-bc2f-9a35db34d76c', // Jank Diver Peasant Cube (Cubecon)
        '42387891-39c3-4eef-852f-17cb6ee7c52f', // Truly Maddening Tempo
    ],
};

export default manifest;
