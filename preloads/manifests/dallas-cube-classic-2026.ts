import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'dallas-cube-classic-2026',
    label: 'Dallas Cube Classic 2026',
    description: 'Arlington, TX - September 19-20, 2026',
    links: [
        { label: 'Event Website', url: 'https://dallascubeclassic.com', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/zW2qGd6W2M', type: 'discord' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 3 },
    cubes: [
        '5fc9e578bada5f7f15feb582', // aquaone powered
        'a06fe1de-5e2d-45a5-ab7c-32c69192ed5f', // 100 Wallythopters
        'a71be443-3aef-424a-bc37-64af56b6c1e7', // Museum of Modern
        '4a466431-fdb8-4283-b693-f365795d8984', // Leniently Legacy
        'f6100e66-7c57-452b-a0a1-10f213eab2ae', // Magna Terra
        '62028de443cd0c53e6e1d661', // Eiganjo Drift
        '60886f462e6452103fa39792', // The Tempo Cube
        'ec3dd53b-973e-4827-a1ce-7a0608b98f74', // Red Dirt Cube
        '9db286d7-5608-4c8e-984e-529a6b5288eb', // Dramatically Discarded
        '653c2f9d-6995-4709-b635-f6bd2f8801a2', // The Dallas Cube
        'efe12812-a950-479b-b348-1018d11774c4', // Kube
        '297ed037-e128-417f-b9d2-6b3ba6e3edd5', // Cube of Many Faces
        '5780df45-bf42-49ed-ae00-24c280998b6b', // High Standards
        'f9c8795e-71f7-4e3f-a590-64d1a56000a8', // Learn your Lessons
    ],
};

export default manifest;
