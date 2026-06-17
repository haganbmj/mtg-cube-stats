import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon-voting-all',
    label: 'CubeCon 2026 Voting (All)',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Voting', url: 'https://cubecon.org/vote', type: 'voting' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 2 },
    cubes: [
        '3e1e506d-c1ec-4002-8879-6ea4af066ea1', // One from Everything
        'ac6bfbc4-ff35-4c6b-aab7-4c162e4d5594', // Communications Disruption
        '6bbd325f-98f2-4968-8976-0aef6303dcb5', // Khans of Tarkoria
        'b2c27903-e5ca-45a7-b264-2239c18217cb', // Esper Cube
        'b78e8768-c76c-4a9e-9632-312788939d99', // The Tides of Light and Shadow
        'dcfaa0fd-333c-409f-a87d-9d4aacd0d462', // Decidedly Mid
        'd167470c-b7ba-4fac-b9a1-2ed599357d54', // Prismatic Wilds
        '045800b1-bac8-4ee1-86a6-9b6b31212d11', // Spooky Black Halloween Graveyard
        '8a082613-660b-483e-8532-fe652b5e14da', // Unseen
        '63e44d4ef4f93b0f6cd5ea94', // Ian's Proliferate Cube
        '03e496c1-3fb2-4437-9004-07f727256de6', // Gingercube
        '5ea28db074a359107218b961', // Galaxy Brain Cube
        '5f3d9de37440640ffe566247', // Old: The Cube That Makes You Old
        '6222bc98eec6851011140979', // Glory Days
        '63fec3ba02c0886f86a19719', // Breya Companion Cube
        '6372cd86367702723da47b55', // Secrets are No Fun Unless you Share With Everyone
        '52e9c0e5-b187-486e-8067-38c6cf6c1ebd', // Bailout Cube: Modernity and Oct 3rd, 2008
        '6180bab477b57f10205556fd', // Cycle Cube
        '69e20be4-d7d3-4f46-8585-6c64e04b9c79', // THE Combo Cube - CubeCon Edition
        '8f2e2e54-88b0-42f7-af64-943760d9d0e7', // Mazes in the Desert
        'c2ca51b2-e33f-4c6d-b63d-974a9d1e7923', // Matt's Chrome Cube
        '8edee7b1-9d95-4007-8a76-512a97911344', // Breya's Scrapyard
        'e4810e35-6e75-443b-8215-83d1cb609e8a', // Kindred Cube
        'd5c56175-4e10-4e41-9e4e-08fc01439c4b', // The Legacy of Bloodwake Atoll
        'c87a14f1-d924-4777-9d12-5c50ee9b1ac6', // Samp's Arena Cube
        'e7e1e793-f89b-4db8-bc2f-9a35db34d76c', // Jank Diver Peasant Cube (Cubecon)
        '6c078fb9-5559-4296-a57b-5d86ed19ae90', // HeatherCube
        'f0dd3b67-ddbc-4bc3-a7d0-b600fd0944e2', // Pauper All-Stars
        '9b10cb19-6018-4f14-8682-1a4e38d9d526', // The Pit
        '62e12d83-0030-4fef-b661-a277135bfe02', // Spy Games
        'ce8e8ab8-060b-48ef-b051-bb8cdf93a424', // Enchanted Teachings
        '0fb014f6-3fe1-486c-9cfb-81a78053208d', // How Bazaar, How Bazaar
        'a9c0e9b6-9748-4574-a8bb-94ebd1f3c5ec', // Free-99
        '1cd57007-e79e-4063-99f0-c5941a0a5fa7', // 2025 Cube
        '75763a82-776a-4c55-973f-cff171f213d0', // Foil Modern Horizons Cube
        '63c48f2f02b8ff49e0636a35', // Omniscience
        '1a06dbf9-f2d9-4d10-bc38-c2955b691b04', // The Epic Experiment Cube
        '43b538e8-bb25-48c5-8452-36c209e8a9ed', // Premodern Kitchen Table
        'cb3f23e0-5e6e-44e3-bc40-45b1132942ad', // Hall of Legends
        'd5a5344f-7060-4c2a-a861-1d2ace71d673', // Six-Colored Calamity
        '54b83fc2-a2a9-4f51-8719-6f4be010a758', // jeskai powered cube
        '768edbac-627d-4e18-b555-4001ee1e5a13', // Zac Hill's Vision of Standard Cube
        '62b52e13-b269-441b-81ed-5f4a7a861e8f', // Combat Cube
        'a3ba76c8-9c66-4133-bb8d-61619d159454', // The Lord of the Rings: Tales of Middle-Earth
        'ce678ae4-ed17-41fc-88c8-b6c66e305c0b', // The Exile Files
        'b1446ca5-d55e-4a34-9127-8652ec379194', // SSSSSignature Cube
        '6d48afc3-864b-4b26-87db-9fe9ce9e0b94', // Humanity's Finest
        'dbe38e53-541a-4d2a-824d-c70798374000', // 540 Card Human Cube
        '2fc8dfa5-2d73-445a-9611-35f03b753820', // The Standard Cube
        'ed730eb3-877b-40a4-aed3-d3569f4d1265', // White Borders
        'b3298474-c560-46ec-af3c-cf65e1421c78', // Grixis Desert Cube
        '5e5e2634a0b97a386ec62703', // Rarity Cube
        '773dac30-0290-4c10-b140-530dc856d26b', // Adam's Ethical Synergy Cube
        'e4f78fea-edfe-4134-af6c-30878142e035', // Death By Ten Cuts
        '472863a8-6cf1-4234-8748-a0d8951f016b', // Design Mistake Retirement Home
        'ee492ddf-784e-4482-917b-37c0e97a83a1', // The Grimm Wilds
        '1732d8d0-6803-4d60-8680-3a8e0f05a664', // GUT
        'f869b848-d960-43d9-aac0-eac1f6b06a00', // The Redline
        '69b5dd88-2b47-4476-9899-3a33d1baf65b', // Ixalan500
        'e79fb711-6ead-4736-94d0-904d4773653e', // A.C.E. Synergy Cube
        'a88a0418-0a55-457a-92f9-cdf44d362750', // Bridges Over Troubled Water
        '4284258f-89ec-4dd7-a7c8-6bb46f4829d7', // Bergy's Synergy Cube
        '0e2e86be-6674-4e69-be38-6a3ba63c0a93', // Stadium Stampede
        '555f0bbc-c056-4c2f-b103-106bcfddc152', // The Promised Land CubeCon Edition: An Oasis Cube
        '8f18005d-6573-4520-b437-93faf6cc8311', // GhostBox
        '61483627-042e-4a6c-b1ba-5aae1896d3d1', // The Mono Red Cube
        '95e54429-d20a-43e8-accc-806f20890123', // The Monored Cube, by WOTC Game Designer bsweitz
        '4c478d44-5c46-4abf-8354-1bc316e66884', // Synergy Cube (Jeffisepic)
        'b28a6704-9917-4baa-9979-eb2c825bbef2', // Reading The Card Explains The Card
        '4cf0a6c4-3d4f-42e7-af9e-ff24daf49bd4', // Life, Death, and Undeath
        '79a4ea6c-e624-4a41-b19f-08e983f64475', // Bobby Hill’s Thopterpalooza!! (100 Ornithopters)
        '4f131833-035d-48a2-bcf7-db23cb3633ee', // Daydreaming
        '6e43c785-3861-43c3-bba1-4370a26e34b3', // The Combo Cube, by WOTC Game Designer bsweitz
        '50cb0d25-4bc9-43c8-b517-26f1f3a55828', // Cream City Cube
        '5ec035faacf42148a1441916', // Subjectively Fair
        '630291c300eb860734853b05', // Clean Evergreen
        '81a7639f-fe0f-4ad2-9bbd-2f3dc35cf484', // 1UP Cube
        'd774a7c4-90f1-45d8-a647-dbba720b1e6e', // 100 Ravagers
        '6291a0072d25a32206e9e19a', // Good Old Days: The Classic Frame Experience
        '95b09247-42b1-4947-b5ae-1335bf675592', // 100 Conjures of Ugin
        'cddf58df-e482-4a2c-bec3-b0210a0febd3', // Fours To Be Reckoned With
        '51eafd69-b474-4aa7-a538-165aca1d41ec', // The Carlsbad Cube
        '0667a7e7-3392-4972-adb9-622d3ff5a9f8', // Evil Horrors Cube
        '5d5f69612af66a30f9bb9b10', // The Ham Sandwich
        'e9ef27a5-d16e-4fec-8414-204a20177d1d', // The Tundra (360)
        '5e5de2c7a0b97a386ec61aba', // Othesemo's Pauper Cube
        '54cbb003-f636-4eed-bfeb-a5dd76516dd9', // The Fish Tank
        '6355dc748bd22a1c87d1637b', // NBL Pure Modern
        '625d6fc351186a0fe97fd370', // Mono White
        '3a1576be-61d7-4d53-a9b9-3b51247f0173', // Home on the Plains: A Mono White Cube
        '1a92126c-06e8-4de5-8b9b-cf78ef0c0bbe', // Tale as Old as Time
        'dd921b61-7e3e-4d0c-9f2b-68b879a6110f', // Worship the Gods! A Theros Odyssey
        '6052411b-0d0c-4298-b212-5acf9f9a1f65', // Paris Pauper
        '1daac6ea-813b-464c-8a84-b42d5bfa0345', // The Peasant Signpost Maze
        '66fa518d-834f-4dd8-a26a-6f62a0c78f00', // Low Budget, High Power
        '5d893e44e9d4421b2dd8ff45', // The Endless Cycle
        'be4243ba-0f0c-4ef9-a2f5-77bbe53b0c81', // Back to Basics
        '759e26a5-31cf-413b-8e28-0a1b3d0db97f', // Beastars
        '5fca9a5abada5f7f150c8c2e', // Hackett Cube
        'eef7f190-d3b0-4c53-8c03-c97f1dcbfbf2', // Bourbon Cube
        '2dcf6fff-76c0-48bf-bc40-bd7ccb87b15d', // The Graveyard Shift
        'bdd22c80-e14b-48aa-b7aa-3122d0dd1ebd', // Cube Save America: The Obama Years and Frame Realignment
        'f1477c6a-0b1d-4005-a91a-f3979175e43f', // Signature Summons
        '89529b3b-d1da-45dc-ba3d-c2a73cd7fd8e', // Party At The Owl House
        '04cc1ad9-2759-45c9-93be-765d0534153b', // The Midas Touch
        '71a6c512-0d90-4801-a0fc-5864f5d468fb', // Tiny Axe
        'f1428f33-9bed-4d91-8158-2b6c17cb19cf', // Old Border Boomer Fun Cube
        '6622ab33-89cb-40f9-b80b-fe056d9ca5bd', // The Chrome Wars
        '83b68fda-6731-4110-8f50-d5772f6250fc', // Kamigawa-Time Spiral Museum: Golden Age of Standard
        '7e440c69-038a-4dbc-bac6-ca77b0ee4088', // Rakdos Pauper Cube
        '272013bb-a5a2-4e3e-a666-23bf90b26fb8', // Science Cube
        'ae9f493b-b6c8-4a73-9c09-35d9010e2a42', // The Trinket Cube
        'ea02f944-8489-410d-95f2-2ce6837b264a', // Tarkube - Reforged
        '7ee389d9-61c7-45ab-9078-97ebfe2e9d9a', // Good Clean Magic
        '63aa6dd3331aeb270eda1573', // Daneelius's Peasant All Stars
        'a374e4bb-ad6e-4bf6-b9a7-5eadfce5c13b', // What if K'rrik were real?
        '62b40b50f7573b1c2d86cc75', // Channel Cube
        'b059cecd-c525-4d1f-9d22-e75cb767ea40', // Triptych Cube
        '105923ac-0e70-4422-9bce-ba6e4707cb3a', // Old School Blues 4.0
        '3fe9a077-5cc7-44a5-9fc3-356e07fecbe9', // The Casebook of Tamiyo Planeswalker
        '60e5362c-8366-4f35-9657-8fcf8faf40cb', // Call a Judge Cube
        'e353934d-cfe8-4eb2-90f5-6e6688b86ebb', // The Trading Post Cube
        '1b2ea748-6813-4f59-8800-f098575d6623', // Mono Green Cube (CubeCon Edition)
        '62810100-54ce-40ac-b769-54fac4ea781a', // Ravnica Cityscape
        '6667c097-c8f4-48f5-9402-5450eda79f15', // Glory Tag Tournament XIV
        'd7da9efa-55fd-422e-973a-e2ad8cbf65df', // MV:1
        '11568f17-3982-4450-8708-3bdcf4625b6e', // We didn't start the F.I.R.E.
        'acf0bb88-6a3d-4990-af63-026e8e5f3caf', // game zones cube
        '5ee84f3e7c9901100bc212d1', // Fifteen Card Highlander
        '80d26640-d7bd-485e-8c0c-486a717bf008', // Sarah's Vintage Cube
        '42387891-39c3-4eef-852f-17cb6ee7c52f', // Truly Maddening Tempo
        'fb3d87fd-0efa-4391-82d0-461ae9ad3476', // The Star Field
        'b078c2c7-9d47-4b21-ab8e-261e7185d7ef', // What does it cost?
        '91add4db-5356-4a1b-bcee-f51f2b2196f6', // Synergy Cube (AColonyOfAnts)
        '3029bb6c-7b67-4f02-ad8b-e298b2cfa721', // Arcbound Cube
        '3b63f9b4-99b1-41f0-ab05-b3dc7850c9c1', // Like Tears in Rain
        '2bc8ff2c-228c-4660-8d7a-b21e53695459', // Nefarious
        '3732a789-73a7-4148-8941-9b65ad45143e', // The Keruga Cube
        '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // The Kuleshov Cube
        '3b5e5b8b-4aee-456f-b0a4-fd1994c31565', // Jank Assembly
        '7697a41d-bb30-4bea-8d2e-2924c1cc0b7c', // Desert of Invention
    ],
};

export default manifest;
