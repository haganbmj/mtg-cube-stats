import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-voting-6-19',
    label: 'CubeCon 2026 Sudden Death (Fri 6/19)',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Voting', url: 'https://cubecon.org/vote', type: 'voting' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        'f0dd3b67-ddbc-4bc3-a7d0-b600fd0944e2', // Pauper All-Stars
        '4cf0a6c4-3d4f-42e7-af9e-ff24daf49bd4', // Life, Death, and Undeath
        'dd921b61-7e3e-4d0c-9f2b-68b879a6110f', // Worship the Gods! A Theros Odyssey
        '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // The Kuleshov Cube
        'b059cecd-c525-4d1f-9d22-e75cb767ea40', // Triptych Cube
        'b3298474-c560-46ec-af3c-cf65e1421c78', // Grixis Desert Cube
        'ce8e8ab8-060b-48ef-b051-bb8cdf93a424', // Enchanted Teachings
        '6622ab33-89cb-40f9-b80b-fe056d9ca5bd', // The Chrome Wars
    ],
};

export default manifest;
