import fs from 'fs';
import { remapCube, computeSimilarityMatrix } from './src/util/CubeFunctions';
import { getCubeData, fetchTopCubeIds } from './src/util/CubeCobra';
import type { Cube } from './src/types';

const isCI = process.env.CI === 'true';
const refresh = process.env.REFRESH_PRELOADS || 'false';
// Days since Unix epoch — rotates shards predictably once per day,
// independent of workflow run count.
const shardIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

interface Batch {
    name: string;
    staleThreshold: number | undefined;
    shardCount: number | undefined;
    cubes: string[];
}

// Prefer using Cube IDs here rather than the user-defined short IDs that can change.
const batches: Batch[] = [
    {
        name: 'wotc',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 4,
        cubes: [
            '5d2cb3f44153591614458e5d', // MTGO Vintage Cube
            'ef9deff3-c05a-4dc1-a43e-45ad0990e784', // Arena Powered Cube
        ],
    },
    {
        name: 'cubecobra-top100',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 4,
        // Populated at runtime from preloads/cubecobra-top100-ids.json (refreshed weekly)
        cubes: [],
    },
    {
        name: 'peasant',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 4,
        cubes: [
            // Combination of Peasant Discord + a few others that I follow.
            '5d5f69612af66a30f9bb9b10', // haganbmj - The Ham Sandwich
            '61f51c3df1d9250f21664d1a', // AlfonsoGallegoF - 450 Peasant+
            '5d838062b656d33b0d553226', // ArBoR4817 - Peasant Cube
            '5ef783a507ee7f4bdce2bd3d', // CSabor9 - Peasant Cube
            '63aa6dd3331aeb270eda1573', // daneelius - Daneelius's Peasant All Stars
            '1ecdc12c-d99e-465a-9bf0-1d68dfb8238e', // djsterlingsilva - Arena Peasant Twobert (@TLA)
            '6003518eeaf0061046b4c9ae', // AirborneMoxen - The Peasant+ Cube
            '617af2103fb907102744a871', // Genericname1 - Pleasant Peasant's Cube
            '93a89c12-0dbe-41d6-8f68-63218099217d', // Gian519 - Gian's Peasant+ Cube
            '5fba82998e1dc31071ad84a4', // ianbraverman - Ian's Peasant Cube
            '609351a5a02941105586647d', // JaneMcKinney - A Box of Peasants
            '5f4c7bcfda93e330d65628ce', // Leelue - The Official Peasant Cube
            '5e2b7c143e1bce2f442efc45', // naynay666 - @naynayscube
            '615235320674da101ef4872d', // Nexon - The Solar Peasant Cube
            '0596b919-1a41-4630-969b-0aeed7918b32', // Pyrrhus - The Pyrrhus Peasant+ Cube
            '640958a55280aa75845268ad', // rossscott - ross_scott peasant cube
            '61f0a7465924cc05a44ad71c', // Salado - Peasant Cube
            '8ac56c6f-9d25-4548-83f6-e04336db2eec', // shylax - Limited All-Stars (Peasant Cube)
            '5fa71a9957aea647df2480e8', // Squirrely - The Nuts Peasant
            '613bee1f5af537103e15d895', // Thetrufflehunter - Profoundly Peasant Cube
            'efd54fa5-39aa-4fe0-94b1-7d4d6e219a1f', // Trizeam - Trizeam's Peasant Cube
            '5e15392c09f9671fcb1dc6e0', // watertheweeds - 450 Peasant Cube
            '09eb35c7-3c13-4fa4-8035-6edc4cd295aa', // windston - Greenless Peasant+
            'ffa4acad-f82e-4a9f-b87b-2994a7eb966e', // windston - Windston_Peasant+
            '742939f0-39da-4fe7-88f6-2f6d1cdc1775', // MoxYargle - We are all peasants now!
            '5e878d986f01105bb05f9df9', // Kattvalp - C/Ube
            '5d3ed83247586d63776acbf6', // sammich - Sammich's Peasant Cube
            '5e501a1b0304345db201ee2a', // mountainmage - Mountainmage's 100% Artist-Signed Peasant Cube
            '608fd59e0938891048b2490e', // BrownDog5117 - Peasantville !!!
            '6377de78946dbd0f6a6e8fff', // Emmmzyne - Peasant Cube (2026)
            '5d3f7245d1bbf667dd9d4286', // MatEffect - The Peasant Cube 2026
            '5d70f0322d52e15c2537f057', // Spootyone - The Spooty Peasant Cube - 2026 Edition
            '5e8c9f60a0c28578ee03de2d', // JankDiverGaming - Jank Diver Peasant Cube
            '5da9ff1872d31f3e1c1377ff', // CorakTM - Corak's Peasant Cube
            '5d5ed579726e4277c7bb1e32', // calibretto - Calibretto's Peasant Cube
            'ea07f680-99f4-4a80-83ed-084a6d3b6121', // Leelue - 80th Percentile Peasant
            '5ed29a43d44a3c102e14500a', // AmazIsCool - Amaz's Peasant+ Cube
            '5d72c6cad13edd6540aff5f3', // cr4cksh07 - Mad Peasant
            '5d498d7797ca265764f113bf', // DammitJoel - Peasant Synergy Cube
            '5f76cacbdebf310362b90289', // ZeldaExplorer - ZeldaExplorer's Peasant Cube
            '5e4fec00b2fc055a2a149986', // WasherDryer - Peasant Cube
            'f0a3ee59-d86b-4449-a8af-a90ed977089a', // Shrimp72 - Shrimp Cube (Peasant)
            '5f02e8171a314e101892d630', // resporius - Resporius's Peasant Cube
            '899cecd6-78cd-4c8f-a3df-ae08244e8de7', // SHRIKE - Peasant+ 2025
            '768c2165-e9d7-4485-9a4e-d7ce0754303b', // eklug - C/Ube
            '5dc5a6af83065f5e62dd3e35', // RosencrantzDies - The Elysian Cube
            '2c5a6b43-6541-4904-8dad-3ba32b737ea4', // Cryonicity - Camelot Cube (old)
            '480e729f-55bd-423d-8c38-7ed8fbead377', // Illuminous - Illuminous Peasant 360 UB nonsense
            '5d9fd6df1f2af308d72ddf35', // UlkaMTGN - Ulka's Peasant Cube
            '90d860e8-ab6c-4163-b1fb-19722ac000b5', // UlkaMTGN - Peasant's Past
            '620e7a29eeb8c87a13d0e8ca', // UlkaMTGN - Turbo Peasant Cube
            '5f6f2e34dc7295103b6290ff', // Shadowkillerx7 - Peasant all Foils
            '5d95438ad09b6308ae8e8d43', // cVantez - cVantez Peasant
            '758acb73-3cf5-4789-b29e-f9b0e4a11aa1', // Alakokain - Peasant Cube (2025)
            '617acd9065d6d310149192fc', // ilovebaskets - Pretentious Wind Socks
            'c952401b-1cea-4a4d-837f-b335e28e078e', // pastinflames - Middle-Class Peasant
            '5ec5c9197868862b1f42c0d1', // Double - The Silver Lining
            'd9c10213-59d8-46ae-9941-78d523adc52e', // Double - TSL Testing Zone
            '60eb90e47bdeb510201cb11e', // RyanOverdrive - Peasant Twobert
            '557847ff-ac94-428e-89ab-4d8991c45266', // Oophies - Peasant Desert Cube
            'fab2344b-bfaf-4140-96a7-42ad314e5b44', // Sharkman1231 - Fetch Peasant
            '75b74553-bb0e-4cc0-bfc5-232b94dabb6e', // Magnet - 375 Black & Silver Cube
            '74ae63f5-af7e-43af-81e5-5c87fd849102', // F1etcher7 - The Peasant+ Buildaround Cube
            '131ac14b-6d71-40b7-8acd-d43c34d53317', // Psykomantisss - You Talking About Cubes?
            'e50ee9af-f70d-4f77-826b-eb6030bede71', // Komali - The "Dog Walker" Cube [360 cards]
            '616f6b81302701102974518b', // zacthecrafter - Standard Cube - Peasant Edition
            '5fd9198667f5213e0da09af8', // SwitchCase - The No Nonsense Bar Cube
            '5dc9a40346d0bd7d478b6c3c', // Isticle - Evergreen Cube
            '5f3aac1135fe7a0fb6c68f58', // michael921 - The Collection Cube
            '5d8c01586800702babd1a76d', // Silverblood - The Noob Cube
            '5f232572d869941039352417', // digitalSloth - The Polished Peasant
            '5ecd72cf4022a8067a2bd959', // ReleaseTheAllicin - Rally The Peasants
            '5fe77e9126f9a30fd142788b', // gbrell - GBrell's Peasant+
            '629004baa478db0ff2c963ff', // dnolan08 - The G.O.A.T. Peasant Cube
            'b3436656-0dfa-40d8-a11d-698c7791e9b6', // livethedream - The Peasant + Combat Cube
            '5e26d17463c7ef63a8986401', // Purtagio - To Synergy and Beyond
            '60345f7e98852d10440afc4b', // cubedraft - Dominaria Peasant Cube
            '604fd7038858261043aff963', // ArborAxis - Peasant Cube
            '5e78e0ef40eaf0158e593517', // FiniteMTG - Limited as Garfield Intended
            '5ecae527f3c65270129f5a28', // Tiray - Synergy Peasant Cube
            '60994bd609fbf3107a183e62', // mythighs - Budget Peasant Cube
            '5ee1b71164abb70f9b426faf', // Jagomu - Super Peasant Arena Cube
            '5e8ef1cfa0c28578ee18a51c', // VariSami - VariSami's Peasant Cube
            '60432223f5b25f105ab4a1cc', // Char7 - Peasant Arena Cube (The Noob Cube)
            '630ac3e02107c1434437113f', // PengasKhan - The Basement Peasant Cube
            '5d8ff216f1db0749f1396834', // n00b1n8R - n00b's Peasant Cube
            '608565bb3d2514106efdf765', // razorlead - Power for the People
            '5e6014d7f9730a46084c1e96', // FunkyDragon - FunkyDragon's Peasant Cube
            '5d753dd88f152803feae83a1', // Squirrely - Squirrely's Old Frame Peasant (+rare lands)
            '614788f7076b331a38983787', // richardgc - New Frontier
            '5e646fe670240a58539a3fee', // Narvuntien - Cards I Own Cube
            '3763af72-6ad9-4f01-9264-318c57df3aa7', // Uteqoute - Uteqoute's 360 Peasant C/Ube [No UB]
            '375a3eb7-33bc-45e9-821e-e699cf196ace', // PepperMyr - PepperMyr's 360 Peasant Cube
            '5f1c4ebcbb7e6b105ca59780', // rancoredmalone - Peasant Snow CUbe
            '315272ac-9bc6-45ee-82d4-2e2279b034fe', // SultanYakub - Resource Cube (Open Beta)
            '8cf14ff3-b9fa-486e-9faf-ce37c1a8ccb1', // emielboven - Emiel's Peasant Cube
            '5dc657d5930245513fdff287', // campervanbeethoven - Uncommon Cube
            'cccf5f35-7800-4135-a52d-1678d9dec978', // Minty - Minty 360 Peasant Cube
            '3f208867-323a-46c9-9fd2-97a9fdfe7100', // nomadmtg - The Limitless Peasant Cube
        ],
    },
    {
        name: 'shoebox-2026',
        staleThreshold: undefined,
        shardCount: 2,
        cubes: [
            '5fc9e578bada5f7f15feb582', // aquaone - aquaone powered
            'b67c9d5e-5cf5-46f6-bb3d-58a014df6a1a', // dinrovahorror - Companion Cube
            'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37', // andymangold - 100 Ornithopters
            '61454789685c83106293be3c', // Deinonychus - Bodleian Cube
            '62028de443cd0c53e6e1d661', // LuckyLooter - Eiganjo Drift
            '6a54d0b5-493f-4339-b652-fd277d177717', // JaneMcKinney - The Ball Pit
            '0870c9d6-b66e-4647-beda-6f1942b672b9', // aibretty - The Fire Swamp
            '27227872-7676-4df8-bc04-4c32ddc7924d', // brinkleysound - Hoopin
            'a71be443-3aef-424a-bc37-64af56b6c1e7', // LuckyLooter - Museum of Modern
            '5d39e7f38472c42aab0b73d6', // dekkerglen - Tiny Leaders
            '636e940b282cc10f6a181e75', // Kapernaumov - The Penrose Cube
            '5dc9a64553f3101ce8e1d08c', // Isticle - The Devoid Cube
            'cb3f23e0-5e6e-44e3-bc40-45b1132942ad', // griffv - Hall of Legends
            '1efd75a8-91de-498c-b3ee-24df7bde3a38', // IslandPonder - Alternate History Powered Cube
            '63322a647545331a605f8df1', // Rinth - Spicy Ramen Cube
            '5d6c2b61de02de10673665f7', // JaneMcKinney - The Tabletop Cube
            '6c078fb9-5559-4296-a57b-5d86ed19ae90', // IanGitax - HeatherCube
            'f65374a7-f50c-45a6-a6e2-97093854a36d', // gogt200 - Avishkube
            '623220f59876560fe936f3b9', // inkfathom - Budget synergy cube
            '68d9dfb8-2e06-4735-a4aa-535255e66c15', // DarthPinkHippo - Disaster Movie Cube, convention edition
        ],
    },
    {
        name: 'saltbox-2026',
        staleThreshold: undefined,
        shardCount: 2,
        cubes: [
            'dafb7624-8329-4ac7-af2f-7ad80f94b038', // frogirl - The Wetlands
            '8c5cddc2-7236-4728-9663-90c0ac2afcb5', // Phantoom - ZoSo
            '42e16b6b-3c37-484d-a50c-cf21087d97fd', // dorsalfin - Red Terror
            '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // haganbmj - The Kuleshov Cube
            '9612ef94-a40f-446d-9244-a19a94dbcbcb', // SoftMaurice - Trenchfight
            'd84d1801-703a-4ae2-b59b-270bcf796d25', // djbeatle - Virtually French Cube
            '3c8379e4-dcf7-45da-9cd3-ad3e12592304', // andymangold - Sacred Geometry
            '5dc09316845516168633e492', // anthonymattox - Regular Cube
            '5fae85ff8459ff65ae3572c3', // fireroomfebbie - Reading Rainbow
            '5d75442c8f152803feaeb607', // Kapernaumov - The Emerging Cube
            'e5699dac-3158-47f3-8113-c2b7875341cc', // LuckyLooter - Arcane Lessons
            '2f86175d-8675-4c23-bc20-644c6e9dcb07', // Phantoom - The Oldest School
            '6374701db5261f6ef4c47a28', // apocta - The Odyssey
            '5f3c0b1b69d5fd104e8e2c76', // Amelfa - Super Magic Fun Times
            'cb64796b-b7c8-4a39-8a3a-13f5f38a39a6', // BigNuggetHusband - The United States Environmental Protection Agency (EPA)
            'ec2a20db-4131-4dcc-8e94-4539db2fc49a', // andymangold - Take Five
        ],
    },
    {
        name: 'vertex-philly-2026',
        // staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        staleThreshold: undefined,
        shardCount: 3,
        cubes: [
            '05426587-9751-4292-b1f8-e85c37e74223', // monicamillions - Girls' Night
            '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // haganbmj - The Kuleshov Cube
            '2f166be5-e08e-4223-8883-4782471f58b4', // Kerby - Omnipresent Imposters
            'e466a21c-0a3a-433f-8196-7fcdb844f430', // jms772 - Jason's Lightweight Cube
            '272013bb-a5a2-4e3e-a666-23bf90b26fb8', // takato3109 - Science Cube
            '62eee89b3106370bdfeffdb2', // vedalkensamurai - Standard Metagame Cube '23-'26
            '549eb6df-e390-4eb3-895d-f1e1cac77f7b', // frauwacholder - B.O.N.G. cube
            '0bbec4a4-a4e1-4474-8832-17deabedf622', // Sulla20XX - The Whetting Stone
            '61d31f05be8c31103b575e0a', // TheOinkinator - Bolt Cube
            'b67c9d5e-5cf5-46f6-bb3d-58a014df6a1a', // dinrovahorror - Companion Cube
            '61454789685c83106293be3c', // Deinonychus - Bodleian Cube
            'cb3f23e0-5e6e-44e3-bc40-45b1132942ad', // griffv - Hall of Legends
            '379dfcb9-3128-422d-adf0-2b8778176c03', // Games - Core Set 19XX
            'dafb7624-8329-4ac7-af2f-7ad80f94b038', // frogirl - The Wetlands
            '8e138c2c-0011-4cd0-aead-ac9c50f53939', // AndyOnline - The Space Between
            'e353934d-cfe8-4eb2-90f5-6e6688b86ebb', // monadic - The Trading Post Cube
            '9612ef94-a40f-446d-9244-a19a94dbcbcb', // SoftMaurice - Trenchfight
        ],
    },
    {
        name: 'connecticube-2026',
        staleThreshold: undefined,
        shardCount: 2,
        cubes: [
            'a053a34d-2aca-41bf-902b-63f57872c20b', // FinMint - The Circle of Life
            'e6350388-effe-463f-8bc5-76bc99ba6e98', // kfergy2323123 - The Control Cube
            'b02c4845-651c-4ecb-89cf-43956bc7404e', // Graham - Graham's Mono Red Cube
            '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // haganbmj - The Kuleshov Cube
            '517cd182-38af-4a5f-a12e-50ced313078a', // dekkerglen - Loam Cube
            '5ee84f3e7c9901100bc212d1', // DoctorDapper - Fifteen Card Highlander
            '63f8e97f81e88359951591ee', // Jarizos32 - The Altered Cube [Top 8 Only]
            'a71be443-3aef-424a-bc37-64af56b6c1e7', // LuckyLooter - Museum of Modern
            '5fc9e578bada5f7f15feb582', // aquaone - aquaone powered
            'e353934d-cfe8-4eb2-90f5-6e6688b86ebb', // monadic - The Trading Post Cube
            // 'ae9f493b-b6c8-4a73-9c09-35d9010e2a42', // ianbraverman - The Trinket Cube
            '62b445e1f1c7606591687389', // blizzyg - Modern Antiquities
            '5fba82998e1dc31071ad84a4', // ianbraverman - Ian's Peasant Cube
        ],
    },
    {
        name: 'c4ac-feb2026',
        staleThreshold: undefined,
        shardCount: 2,
        cubes: [
            '66a046f0-d853-4588-9c23-77c4ea262039', // mgr4dv - Strixhaven Study Abroad
            'ecaf40aa-8361-41c5-8673-4e70c2508cde', // Scottmirts - The Upkeep New York Cube
            'f006907f-c63f-4bfe-b29c-ee8c6a238c33', // Isticle - The Uncanny Valley
            'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37', // andymangold - 100 Ornithopters
            '62410753c1b69f0fdcd1d0b6', // Scottmirts - The Curio Cube
            '05426587-9751-4292-b1f8-e85c37e74223', // monicamillions - Girls' Night
            'fc5e27ff-d5be-4920-bbfe-3c97d1b9b497', // frazaa - Time Capsule Cube 585
            'a71be443-3aef-424a-bc37-64af56b6c1e7', // LuckyLooter - Museum of Modern
            '40c33b63-bd39-40bf-96f0-5685218e85ac', // jclara - Choose Your Own Adventure (CYOA)
            '90a39cf4-6278-40f1-b345-48a248635394', // noahbuchman - Sky and Sea Cube
            '1efd75a8-91de-498c-b3ee-24df7bde3a38', // IslandPonder - Alternate History Powered Cube
            'f294ca48-7807-47e4-804d-7aa339216ae8', // beeks - Doubleton Synergy
            'a7754fee-e00c-4c85-b683-d85ee2c1ce0f', // Scottmirts - Kolosaio
            '7bbdee85-a91b-4b23-b64b-c8c98aea1d1e', // frauwacholder - BONG Cube: C4AC Edition
            '61454789685c83106293be3c', // Deinonychus - Bodleian Cube
            'b67c9d5e-5cf5-46f6-bb3d-58a014df6a1a', // dinrovahorror - Companion Cube
            'e2f39081-b6f3-4b96-a1f4-890379d68a4d', // Isticle - The Perilous Seas
            '6158155be62adc101e305eb6', // ecide - Zonal Synergy Cube
        ],
    },
    {
        name: 'cubecon2025',
        staleThreshold: undefined,
        shardCount: undefined,
        cubes: [
            // var a = ""; document.querySelectorAll('h5.card-title a[href*="https://cubecobra.com/cube/overview/"]').forEach(e => { a += `'${e.href}', // ${e.innerText}\n`; }); console.log(a);
            '99fb819f-e4b3-44bc-becd-1ec878e7d044', // 100 Ways to Draft
            'SagasCube', // A Brooding Saga (Sagas Cube)
            '4631d5be-c7de-4212-8255-ac6755481e3f', // A Study in Harmony
            '43684f97-93c5-4ef3-95e8-8a8095859232', // The Absolute Junk Cube (Abzan)
            '63cce449380c7a0f69a6eb1a', // The Aeneid Cube
            'b6ce3845-d40c-4b34-9352-d003dde0e670', // Alpha Reimagined
            '1efd75a8-91de-498c-b3ee-24df7bde3a38', // Alternate History Powered Cube
            '6a54d0b5-493f-4339-b652-fd277d177717', // The Ball Pit
            'c3b39936-aa49-45d6-b6a0-aa6e5b7b7a32', // Ban Shuffling
            '015d501b-a03f-4767-9c7e-5ba667433644', // The Bearclaw Changeling Cube
            'dd8976ec-160b-4bfe-af4f-24e71976967a', // Breaking the Oath Cube
            '623220f59876560fe936f3b9', // Budget synergy cube
            '636be1066c3ec60f6637f150', // The Cascade Cube
            '3fe9a077-5cc7-44a5-9fc3-356e07fecbe9', // The Casebook of Tamiyo Planeswalker
            '62f466df9214065dcd0fe68d', // Changeling Cube
            '6400c8c11b98ce50ca72c39f', // The Chicago Cube
            'a053a34d-2aca-41bf-902b-63f57872c20b', // The Circle of Life
            'a919bfba-3fa9-4299-9b57-c7200c234b38', // coco cube
            'e6350388-effe-463f-8bc5-76bc99ba6e98', // The Control Cube
            'c70058e4-01f4-42b1-aba1-24cb653ab9ee', // The CORESIR Cube
            '6413e9038d5d8938753c40ac', // Creative Cube
            '613d81be1de8d5027f16ba32', // Data Generated Vintage Cube
            '68d9dfb8-2e06-4735-a4aa-535255e66c15', // Disaster Movie Cube, CubeCon edition
            '407e2649-32a7-44e9-9e99-0b75bd4efa7b', // DOWN'N'DIRTY - A HOMEGROWN RETAIL LIMITED EXPERIENCE
            '5fd138969c0782105bfa7c6e', // The Draft Chaff Cube
            '638f36c1ba43583a92f67677', // Dragons of Winter's Night
            '63275d20e755840f6cab1b03', // El Classico
            'enchanted-evening', // Enchanted Evening
            '1a06dbf9-f2d9-4d10-bc38-c2955b691b04', // The Epic Experiment Cube
            'b2c27903-e5ca-45a7-b264-2239c18217cb', // Esper Cube
            'a8e60d85-38ff-45e1-b5bd-b598438ad562', // Everywhere Cube
            '5f37506435fe7a0fb68cebc0', // Falls Cube
            '5f752e164f9e0510497109c8', // The Femme Cube
            '5ee84f3e7c9901100bc212d1', // Fifteen Card Highlander
            '54cbb003-f636-4eed-bfeb-a5dd76516dd9', // The Fish Tank(*)
            '75763a82-776a-4c55-973f-cff171f213d0', // Foil Modern Horizons Cube
            '629004baa478db0ff2c963ff', // The G.O.A.T. Peasant Cube
            '03e496c1-3fb2-4437-9004-07f727256de6', // Gingercube
            '62a0c2097fa73e0ffb2e608e', // Gizmo Cube
            'c32ab1f8-43e9-47ac-b75e-c997ff6f9da2', // Golgari Cube
            'b3298474-c560-46ec-af3c-cf65e1421c78', // Grixis Desert Cube
            '5a1d3ff2-3eec-40c0-849c-e19de60305ae', // Innistrad to Eldritch Moon Golden Age Standard Cube
            '61e6b4fee9cb550ffa2bdc85', // Jarvis 360 'Yube'
            'lavender', // Lavender Desert
            'LowBudgetHighPower', // Low Budget, High Power
            '63582c9cdf3d397423c967da', // Melded Mardu Monarchy
            '338c8a3f-0eff-4293-ac87-8c5bba44168a', // The Modular Cube: CubeCon Edition
            '61483627-042e-4a6c-b1ba-5aae1896d3d1', // The Mono Red Cube
            '95e54429-d20a-43e8-accc-806f20890123', // Monored Cube
            'e58ed71a-8fb7-4d3a-9d39-fbdc3ad6b2c8', // Museum of 2000-2003 Standard
            '6122a60ae66c4a105041808a', // Old Border Foil Cube
            '6c69d23d-878a-44d5-be70-13aa9d157fd8', // Old Border Kitchen Table Cube
            '2f166be5-e08e-4223-8883-4782471f58b4', // Omnipresent Cube
            '302c8800-db4d-473f-b6ed-2dd3467ffa8e', // Options Cube
            '8f3568d2-4185-45bb-886a-f33dbae4cdde', // The Original Old Border Cube (Desert Edition) (CubeCon'25)
            'airbornemoxen', // The Peasant+ Cube
            '636e940b282cc10f6a181e75', // The Penrose Cube
            '620aae27d364780ff32bb6ae', // The Pioneer Showcase
            '5e5e2634a0b97a386ec62703', // Rarity Cube
            '0bd7a9bb-3885-437c-b1a4-af70d8bc67ab', // Ravnica Idealized
            'aeef677f-1990-4fd5-a300-f442a318e933', // Ravnica/Time Spiral Standard Cube
            '42e16b6b-3c37-484d-a50c-cf21087d97fd', // The Red Terror
            '322fffb9-9702-48dc-9113-9c44e9dd3ab1', // Regular Games, Commander Cards
            '5f57d887a382126d07eaddc3', // Sam's Shiny Single Sided Cube
            '5d3ee03747586d63776ad1eb', // Sammich's Pauper Cube
            'sammich_peasant', // Sammich's Peasant Cube
            'c87a14f1-d924-4777-9d12-5c50ee9b1ac6', // Samp's (Paper-Legal) Arena Cube
            '8abe63ae-3d08-4971-b730-bfa0f7c679e3', // Sandman
            '5ecd517c4022a8067a285177', // Sci-Fi Cube
            'dcb002b4-a283-4256-bb00-c008248b9d67', // Simic Cube
            'ddf8d693-05b9-4ad1-8b5b-d4ed1ee9e664', // Simpler Times
            'e47b3c84-4bdd-464c-8bfd-203643389b0f', // The Six Drop Cube
            'd5a5344f-7060-4c2a-a861-1d2ace71d673', // Six-Colored Calamity
            '90a39cf4-6278-40f1-b345-48a248635394', // Sky and Sea Cube
            '63322a647545331a605f8df1', // Spicy Ramen Cube
            '6788cc8a-a18a-4335-87f5-c1e38daf0c92', // Standard Cube - CubeCon Edition
            'c957bc65-007a-4a19-b98b-09073b91286d', // Sweet Treats Cube
            '91add4db-5356-4a1b-bcee-f51f2b2196f6', // Synergy Cube
            '5d6c2b61de02de10673665f7', // The Tabletop Cube
            '6147a122076b331a3898762b', // Tarkir Redux
            'dbb307e0-54f0-47bb-8c9d-327f8a59dba9', // Temur Spellslinger
            '71a6c512-0d90-4801-a0fc-5864f5d468fb', // Tiny Axe Bar Cube
            'eb5f1cd9-8d4e-46ee-9dbb-adaa597996c4', // Tolsimir Cube v1.0
            '3a38d669-7086-4d8b-9252-e51ae8965a2b', // Too Long; Didn't Read
            '42387891-39c3-4eef-852f-17cb6ee7c52f', // Truly Maddening Tempo
            '5ec82086510bc4414742ec52', // Uber Bear's Artifact Cube
            '5ec81c4434de80100aab7393', // Uber Bear's Horror Cube
            '5d8171de91139f32f85d1200', // Unplayables Cube
            '077a945b-f5b0-403c-8900-27bfda429257', // The Vintage Cube Retirement Home
            'f78dab79-4c6d-4da7-9834-85c7eed380a8', // Vistas Unventured
            'd369ae9c-f042-4f19-8073-886de27c88ec', // Way Too Hybrid
            '6189e6d28b06db101e4b5bb8', // Welcome to Theros Cube
            'dd921b61-7e3e-4d0c-9f2b-68b879a6110f', // Worship the Gods! A Theros Odyssey
        ],
    },
    {
        name: 'boston-cube-party-2026',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 3,
        cubes: [
            '549acfea-4793-41ca-b171-b7ae89a9903b', // A Brooding Saga
            '1efd75a8-91de-498c-b3ee-24df7bde3a38', // Alternate History Powered Cube
            '87f695d4-ca23-4827-b4d2-b3db65c7fe35', // BARTIFACT - Boston Cube Party Edition
            '61454789685c83106293be3c', // Bodleian Cube
            '6c3eb882-71dc-4052-80f8-3a4483b33b53', // Boston Cube
            '623220f59876560fe936f3b9', // Budget Synergy Cube
            '5d39ce4b8472c42aab0b61c2', // Bun Magic Cube
            'e71197e7-2a49-4cbc-b985-22051958995f', // Camelot Cube
            '40c33b63-bd39-40bf-96f0-5685218e85ac', // Choose Your Own Adventure (CYOA)
            'a34bdf4b-e7d6-43e8-a026-c3484aff59cd', // COGWORK COMBO
            'b67c9d5e-5cf5-46f6-bb3d-58a014df6a1a', // Companion Cube
            '9a388b76-1eee-4fff-ad25-5d261fe9784a', // Dan Schneider Mysterybox Cube
            '633ccb11d002cd2761ed4f25', // Defender of the Polyverse
            '50d29893-1696-494d-86f1-d48615d160bd', // Delver Cube
            '68d9dfb8-2e06-4735-a4aa-535255e66c15', // Disaster Movie Cube, Convention Edition
            'db24a13c-fb9e-4ab8-832d-476cf304fd02', // Domain Cube
            'f294ca48-7807-47e4-804d-7aa339216ae8', // Doubleton Synergy
            '7d4445ef-271b-4865-b0f7-9fae52409876', // Etherium Landscape
            '5ee84f3e7c9901100bc212d1', // Fifteen Card Highlander
            'acf0bb88-6a3d-4990-af63-026e8e5f3caf', // Game Zones Cube
            '1732d8d0-6803-4d60-8680-3a8e0f05a664', // GUT
            '60597338dc67391048e071cc', // History of Pioneer Draft
            '27227872-7676-4df8-bc04-4c32ddc7924d', // Hoopin
            '68c09094-c473-47cd-893b-e9d8a3d66fbe', // I Loot The Body
            '63e44d4ef4f93b0f6cd5ea94', // Ian's Proliferate Cube
            '54b83fc2-a2a9-4f51-8719-6f4be010a758', // Jeskai Powered Cube
            '6bbd325f-98f2-4968-8976-0aef6303dcb5', // Khans of Tarkoria
            'a7754fee-e00c-4c85-b683-d85ee2c1ce0f', // Kolosaio
            'e7f9707d-3c85-4741-9825-63e43a9e41e3', // Limited Masters: Tournament Edition
            '9b29671c-3e89-430f-b943-46160e93c735', // MEDIUM CUBE 3.1
            'a92f4bd1-b3d5-4469-8577-905041301dc4', // Midwinter
            '839c4979-e2ca-4434-865a-601efd2ce526', // Neon House of Drift
            '5ecd517c4022a8067a285177', // Sci-Fi Cube
            '90a39cf4-6278-40f1-b345-48a248635394', // Sky and Sea Cube
            '66a046f0-d853-4588-9c23-77c4ea262039', // Strixhaven Study Abroad
            '7a5a3fb0-c461-4d31-9e5d-2c91c4c2c9ef', // Hot Girl Summer (Baddie Cube)
            '5f089f4fda10250fbdd5c160', // The Blink Cube
            '636be1066c3ec60f6637f150', // The Cascade Cube
            '02771e17-5ec3-49ce-b718-91ebb8048b17', // the dollhouse
            '629004baa478db0ff2c963ff', // The G.O.A.T. Peasant Cube
            '4dd752c0-1bc1-43af-bbae-9226f554afda', // The Great Aurora
            'f907f0a5-8e95-474a-a879-6cced27aaeb3', // The Middle School
            '5d617ac6c2a85f3b75fe95a4', // The Pauper Cube
            '636e940b282cc10f6a181e75', // The Penrose Cube
            'e2f39081-b6f3-4b96-a1f4-890379d68a4d', // The Perilous Seas
            '3e9e0765-8ee4-4528-8f8c-8fd9657bec19', // The Shepherd Cube
            '924cd58d-5c8e-4442-b71d-593c6def420d', // The Venn Cube
            '077a945b-f5b0-403c-8900-27bfda429257', // The Vintage Cube Retirement Home
            '5d39e7f38472c42aab0b73d6', // Tiny Leaders
            '624673d179f27d1008cbf702', // UMA+ Cube
            '6158155be62adc101e305eb6', // Zonal Synergy Cube
        ],
    },
    {
        name: 'cubecon2026',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 4,
        cubes: [
            'a45a04cd-9b52-42b9-a602-b7f857c1aa36', // A Brooding Saga: Cubecon 2026
            '43684f97-93c5-4ef3-95e8-8a8095859232', // The Absolute Junk Cube (Abzan)
            'b6ce3845-d40c-4b34-9352-d003dde0e670', // Alpha Reimagined
            '1efd75a8-91de-498c-b3ee-24df7bde3a38', // Alternate History Powered Cube
            '015d501b-a03f-4767-9c7e-5ba667433644', // The Bearclaw Changeling Cube
            'dd8976ec-160b-4bfe-af4f-24e71976967a', // Breaking the Oath Cube
            '6400c8c11b98ce50ca72c39f', // The Chicago Cube
            'a053a34d-2aca-41bf-902b-63f57872c20b', // The Circle of Life
            'c70058e4-01f4-42b1-aba1-24cb653ab9ee', // The CORESIR Cube
            '6413e9038d5d8938753c40ac', // Echoes of Creation
            '17fa4f29-ad19-4eb4-94cf-525d2697f082', // Enchanted Evening
            '37475a24-8f7d-448e-b562-1404e42f390d', // THE FLOOR IS LAVA
            '5a1d3ff2-3eec-40c0-849c-e19de60305ae', // Innistrad to Eldritch Moon 2011-2016 Golden Age Standard Cube
            'aefb5841-8654-48fc-9b02-ba5062a651cd', // The Mardube
            '6122a60ae66c4a105041808a', // Old Border Foil Cube
            '2f166be5-e08e-4223-8883-4782471f58b4', // Omnipresent Impostors
            '302c8800-db4d-473f-b6ed-2dd3467ffa8e', // Options Cube
            '6003518eeaf0061046b4c9ae', // The Peasant+ Cube
            '620aae27d364780ff32bb6ae', // The Pioneer Showcase
            '5d3ed83247586d63776acbf6', // Sammich's Peasant Cube
            'e47b3c84-4bdd-464c-8bfd-203643389b0f', // The Six Drop Cube
            '63322a647545331a605f8df1', // Spicy Ramen Cube
            '5d8171de91139f32f85d1200', // Unplayables Cube
            '077a945b-f5b0-403c-8900-27bfda429257', // The Vintage Cube Retirement Home
            'f78dab79-4c6d-4da7-9834-85c7eed380a8', // Vistas Unventured
            'bd9bfd7d-12a1-4442-9b20-5ffee6e8d7ce', // World Championship Museum (96-04)
            '37475a24-8f7d-448e-b562-1404e42f390d', // THE FLOOR IS LAVA
        ],
    }
];

// --- Resolve dynamic cube ID lists ---

const TOP100_IDS_PATH = './preloads/cubecobra-top100-ids.json';
// Refresh the ID list weekly — much less frequently than individual cube data.
const TOP100_IDS_STALE_THRESHOLD = Date.now() - (1000 * 60 * 60 * 24 * 7); // 7 days

const top100Batch = batches.find(b => b.name === 'cubecobra-top100')!;

const top100IdsNeedRefresh = () => {
    if (!fs.existsSync(TOP100_IDS_PATH)) return true;
    const stats = fs.statSync(TOP100_IDS_PATH);
    return stats.size === 0 || stats.mtimeMs <= TOP100_IDS_STALE_THRESHOLD;
};

if (top100IdsNeedRefresh()) {
    console.log('[cubecobra-top100] ID list is missing or stale — fetching from CubeCobra...');
    try {
        const ids = await fetchTopCubeIds(100);
        fs.writeFileSync(TOP100_IDS_PATH, JSON.stringify(ids, null, 2));
        console.log(`[cubecobra-top100] Fetched ${ids.length} cube IDs.`);
        top100Batch.cubes = ids;
    } catch (e: any) {
        console.error(`[cubecobra-top100] Failed to fetch ID list: ${e.message}`);
        // Fall through with an empty list — batch will produce no output this run.
    }
} else {
    const ids: string[] = JSON.parse(fs.readFileSync(TOP100_IDS_PATH, 'utf-8'));
    console.log(`[cubecobra-top100] Using cached ID list (${ids.length} cubes).`);
    top100Batch.cubes = ids;
}

// FIXME: This probably needs a way to record a timestamp for when the last fetch was.
// FIXME: This is just looking at the modified time of the file, which isn't great or available in the page.
// FIXME: Also would need to backfill a timestamp for the cubecon2025 batch, which I'm considering static for the moment.
for (const batch of batches) {
    if (batch.staleThreshold === undefined) {
        console.log(`Skipping batch: ${batch.name}`);
        continue;
    }
    console.group(`Processing batch: ${batch.name}`);

    const batchResult: Record<string, Cube> = {};
    for (const [index, cubeId] of batch.cubes.entries()) {
        if (fs.existsSync(`./preloads/cubes/${cubeId}.json`)) {
            let skip = false;

            const stats = fs.statSync(`./preloads/cubes/${cubeId}.json`);
            const fileAge = Date.now() - stats.mtimeMs;

            if (
                // If we're running in a CI Context, evaluate whether this is an execution that should evaluate Refreshes.
                refresh.toLowerCase() !== 'true'
                && isCI
            ) {
                console.log(`[${cubeId}] Skipping due to refresh policy...`);
                skip = true;
            } else if (
                // If we're in a refresh run, use date-based sharding to spread fetches across days.
                // Override shard policy if file is more than 4 weeks old.
                isCI
                && batch.shardCount !== undefined
                && index % batch.shardCount !== shardIndex % batch.shardCount
                && fileAge <= 1000 * 60 * 60 * 24 * 28
            ) {
                console.log(`[${cubeId}] Skipping due to sharding policy...`);
                skip = true;
            }

            if (stats.size === 0 || (!skip && batch.staleThreshold && stats.mtimeMs <= batch.staleThreshold)) {
                console.log(`[${cubeId}] Local copy is stale or empty, fetching...`);
            } else {
                console.log(`[${cubeId}] Local copy is fresh, using cached version.`);
                const cube = JSON.parse(fs.readFileSync(`./preloads/cubes/${cubeId}.json`, 'utf-8'));
                batchResult[cubeId] = remapCube(cube, false, new Date(stats.mtimeMs).toISOString());
                continue;
            }
        }

        try {
            const cube = await getCubeData(cubeId);
            const fetchedAt = new Date().toISOString();
            fs.writeFileSync(`./preloads/cubes/${cubeId}.json`, JSON.stringify(cube, null, 2));
            batchResult[cubeId] = remapCube(cube, false, fetchedAt);
        } catch (e: any) {
            console.error(`[${cubeId}] Failed to fetch cube: ${e.message}`);
            // FIXME: Should this fault here, or can we proceed then just error out at the end?
        }
    }

    const similarityMatrix = computeSimilarityMatrix(batchResult);

    console.groupEnd();
    fs.writeFileSync(`./preloads/cubes-${batch.name}.json`, JSON.stringify({ cubes: batchResult, similarities: similarityMatrix }, null, 2));

    // Utility for logging out the Cube IDs.
    // Object.values(batchResult).forEach(cube => {
    //     console.log(`'${cube.id}', // ${cube.owner} - ${cube.name}`);
    // });
}
