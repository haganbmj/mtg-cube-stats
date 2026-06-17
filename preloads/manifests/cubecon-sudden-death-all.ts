import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-sudden-death-all',
    label: 'CubeCon 2026 Sudden Death (All)',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Voting', url: 'https://cubecon.org/vote', type: 'voting' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '62b52e13-b269-441b-81ed-5f4a7a861e8f', // Combat Cube
        '6291a0072d25a32206e9e19a', // Good Old Days: The Classic Frame Experience
        '7e440c69-038a-4dbc-bac6-ca77b0ee4088', // Rakdos Pauper Cube
        '0e2e86be-6674-4e69-be38-6a3ba63c0a93', // Stadium Stampede
        '1a06dbf9-f2d9-4d10-bc38-c2955b691b04', // The Epic Experiment Cube
        '3b5e5b8b-4aee-456f-b0a4-fd1994c31565', // Jank Assembly
        '045800b1-bac8-4ee1-86a6-9b6b31212d11', // Spooky Black Halloween Graveyard
        '62b40b50f7573b1c2d86cc75', // Channel Cube
        '472863a8-6cf1-4234-8748-a0d8951f016b', // Design Mistake Retirement Home
        '03e496c1-3fb2-4437-9004-07f727256de6', // Gingercube
        '8f2e2e54-88b0-42f7-af64-943760d9d0e7', // Mazes in the Desert
        '50cb0d25-4bc9-43c8-b517-26f1f3a55828', // Cream City Cube
        'acf0bb88-6a3d-4990-af63-026e8e5f3caf', // game zones cube
        '54cbb003-f636-4eed-bfeb-a5dd76516dd9', // The Fish Tank
        'a374e4bb-ad6e-4bf6-b9a7-5eadfce5c13b', // What if K'rrik were real?
        '555f0bbc-c056-4c2f-b103-106bcfddc152', // The Promised Land CubeCon Edition: An Oasis Cube
        '2dcf6fff-76c0-48bf-bc40-bd7ccb87b15d', // The Graveyard Shift
        '61483627-042e-4a6c-b1ba-5aae1896d3d1', // The Mono Red Cube
        '5f3d9de37440640ffe566247', // Old: The Cube That Makes You Old
        '51eafd69-b474-4aa7-a538-165aca1d41ec', // The Carlsbad Cube
        'e9ef27a5-d16e-4fec-8414-204a20177d1d', // The Tundra (360)
        '62e12d83-0030-4fef-b661-a277135bfe02', // Spy Games
        'e7e1e793-f89b-4db8-bc2f-9a35db34d76c', // Jank Diver Peasant Cube (Cubecon)
        '42387891-39c3-4eef-852f-17cb6ee7c52f', // Truly Maddening Tempo
        '773dac30-0290-4c10-b140-530dc856d26b', // Adam's Ethical Synergy Cube
        '1daac6ea-813b-464c-8a84-b42d5bfa0345', // The Peasant Signpost Maze
        '4f131833-035d-48a2-bcf7-db23cb3633ee', // Daydreaming
        'ae9f493b-b6c8-4a73-9c09-35d9010e2a42', // The Trinket Cube
        'c87a14f1-d924-4777-9d12-5c50ee9b1ac6', // Samp's Arena Cube
        'd7da9efa-55fd-422e-973a-e2ad8cbf65df', // MV:1
        '3e1e506d-c1ec-4002-8879-6ea4af066ea1', // One from Everything
        'd5a5344f-7060-4c2a-a861-1d2ace71d673', // Six-Colored Calamity
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
