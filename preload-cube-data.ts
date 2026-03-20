import fs from 'fs';
import { remapCube, computeSimilarityMatrix } from './src/util/CubeFunctions';
import { getCubeData } from './src/util/CubeCobra';
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
        cubes: [
            // let a = ''; document.querySelectorAll("div.max-w-full .p-4 a[href*='/cube/overview']").forEach(i => a += `${i.href}\n`); console.log(a);
            '5d71a20e91560b5ef2891e6e', // Chimaera - Chimaera540
            '5d2cb3f44153591614458e5d', // dekkerglen - MTGO Vintage Cube
            '5d617ac6c2a85f3b75fe95a4', // thepaupercube - The Pauper Cube
            '5fab13510efe0d1071b87fae', // gannoncd - Caleb Gannon's Powered Synergy Cube
            '5d39ce4b8472c42aab0b61c2', // andymangold - Bun Magic Cube
            '5d3f7245d1bbf667dd9d4286', // MatEffect - The Peasant Cube 2026
            '5d61aa23b8ec593ca4b76ca6', // wtwlf123 - wtwlf123's Cube
            'aa4ef3f9-0b4f-4bf0-9fbc-5cc3d3ec5e37', // andymangold - 100 Ornithopters
            '786d3a10-43bd-438e-acf4-bb150b881254', // LSVCube - PowerLSV
            'a525ebe1-c9c0-471c-aca3-772f91bf4145', // LSVCube - LSVCube
            '5dc09316845516168633e492', // anthonymattox - Regular Cube
            '5ee1ac60516bcd40db036790', // DankTrainTom - Tom's Commander Cube
            'b4bd2b0e-1f9a-4b71-8a45-db39770b13a1', // AlphaFrog - AlphaFrog Vintage Cube
            '5d707d8cfcb84a5be6ced09f', // DrRuler - The Starter Cube
            '5f7365c9dc7295103b93a28b', // RyanOverdrive - The Original Recipe Twobert
            '5d83674db656d33b0d4bcc29', // dekkerglen - Dekkaru Cube [Retired]
            '5eac352663be2427d677d971', // andymangold - Degenerate Micro-Cube
            '5d8cdc9ddabc762f670c1d2a', // TheJesguy - The Innistrad Anthology Cube
            '5d6c2b61de02de10673665f7', // JaneMcKinney - The Tabletop Cube
            '60f5fab79e954b050e0ae497', // anthonymattox - Battle Box
            '608a4a0131e4aa105f3292c7', // NitpickingNerds - Nitpicking Nerds Commander Cube
            '6377de78946dbd0f6a6e8fff', // Emmmzyne - Peasant Cube (2026)
            '5d5ef816726e4277c7bbc6be', // CavsFangelo - The Cube of Cthulhu
            '613d81be1de8d5027f16ba32', // l0gr1thm1k - Data Generated Vintage Cube
            '61454789685c83106293be3c', // Deinonychus - Bodleian Cube
            '61d3ccc9c7d013102be68f4f', // Gallently - Bar Cube
            '5e8c9f60a0c28578ee03de2d', // JankDiverGaming - Jank Diver Peasant Cube
            '60886f462e6452103fa39792', // grenrut - The Tempo Cube
            '617b36e887d268103f4acd02', // Myagic - May's Fae Cube
            '5d757b268f152803feb030f8', // SteveMan - The Steve Cube (High Octane Unpowered)
            '3c8379e4-dcf7-45da-9cd3-ad3e12592304', // andymangold - Sacred Geometry
            '5b73c9bb-4928-4d6a-9580-30d5a718d925', // TheProfessor - Foundations Student Cube
            '5d2cdf200442c316b0ef86c7', // DrRuler - DrRuler's 630 Card Unpowered Cube
            '605df8591361d3104a896904', // andymangold - Neoclassical Cube
            '60c7b3023b7623103ca84a22', // RyanOverdrive - Tempo Twobert
            '5c340ee4-8896-4311-8ccb-ca811e347261', // RhysticStudies - Kitchen Table All-Stars (Budget Synergy Cube)
            '5f5d768ced6023105164a65f', // anthonymattox - Turbo Cube
            '5ebdf42e7a821f0d637307f2', // xonnex - Hypercube
            '5d70f0322d52e15c2537f057', // Spootyone - The Spooty Peasant Cube - 2026 Edition
            '61d31f05be8c31103b575e0a', // TheOinkinator - Bolt Cube
            '5f175e2240729e103f75cc0f', // ManaDrainThis - High Stakes Challenge (HSC) Vintage Cube
            '5d4c6fcd97ca265764f29fa4', // CulticCube - Eleusis
            '5eb2416d33973f103cfd0a66', // DukeOfBeans - Classic Modern Cube
            '5e87870a40eaf0158ee1292f', // Zangetsukage - Chromatic Cube Draft on MTG Arena, July 2025
            '5ed29a43d44a3c102e14500a', // AmazIsCool - Amaz's Peasant+ Cube
            '615afb91b9880d102e064867', // Mengu09 - Vintage MenguCube
            '3dc1e7ac-338c-4bec-939d-3c2217b5ae18', // RyanSaxe - Magic: the Battling
            '5d3f1c6cd1bbf667dd9cdd1b', // DirkJammer - Commander Cube
            '5ea0960912bf071086e7c06a', // LuckyLooter - The Amonkar Desert
            '6282adea6c523e100d69a4b4', // RyanOverdrive - Pauper Twobert
            '60eb90e47bdeb510201cb11e', // RyanOverdrive - Peasant Twobert
            '5ee3e963a97e3610390bda42', // shaneswalker - Golden Gate Artifact Cube
            '616f6b81302701102974518b', // zacthecrafter - Standard Cube - Peasant Edition
            '5e2e27a4fa6b9a16035bfc78', // RyanSaxe - Ryan Saxe's Classic Cube
            'e1a51d49-9a07-48b1-b2ba-c78b6e65d03b', // zarocks - Lord of the Rings (LotR) standalone 360
            '5d3f18dcd1bbf667dd9cd271', // Shamim - Shamim's Cube
            '62d6302ece709a0f770e76a4', // SamBlack - Commander Cube
            '5d2cdf280442c316b0ef86c8', // DrRuler - The Miser's Cube
            '620a9f770810a7592dac3843', // MJGrenier - A Study in Harmony
            '5e5e7c8ea0b97a386ec63124', // CulticCube - Cultic Cube
            '60b65de720a67b104d4f8393', // Mengu09 - Pauper MenguCube
            '4d7736b4-3394-4868-9ad1-92f91a3f75c6', // lrg123 - Arena Powered Cube 3.0
            '63322a647545331a605f8df1', // Rinth - Spicy Ramen Cube
            '63924837bceae738e0db06cb', // TheOinkinator - Triangularity
            '5dc9a64553f3101ce8e1d08c', // Isticle - The Devoid Cube
            '623f76ea9604ed1015559ba3', // livethedream - The Live the Dream Cube
            '6253f2e117d248100301077c', // hartwjg - Premodern Cube
            '6273d2faf4c99810052d7a31', // Ashachor - Wizard's Cube - Two Player Duel Cube
            '636e940b282cc10f6a181e75', // Kapernaumov - The Penrose Cube
            '638032857504190f6ada9d67', // RyanSaxe - The Buildaround Cube
            '5d3ed83247586d63776acbf6', // sammich - Sammich's Peasant Cube
            '5d5edb04726e4277c7bb31be', // simpleman - Simple_Man's 450 Powered List
            '5dbb7cd2c67d7070936b6428', // japahn - The Elegant Cube (v5.2.20)
            '63bb8d35c7347d0f69799899', // Slaadi - The All-Star Chaff Battle Box
            '5ec82086510bc4414742ec52', // UberBear - Uber Bear's Artifact Cube
            '5d72c6cad13edd6540aff5f3', // cr4cksh07 - Mad Peasant
            '5d5dc31d41c0006b8a332345', // SirFunchalot - Unpowered Fair Stuff
            '5d8ce3b8dabc762f670ed5c8', // RolyMac - CLASSIC CUBE
            '5d498d7797ca265764f113bf', // DammitJoel - Peasant Synergy Cube
            'b67c9d5e-5cf5-46f6-bb3d-58a014df6a1a', // dinrovahorror - Companion Cube
            '5fbdb0735132cb1052e2a6a9', // MtGCube - MtG Cube
            '5fd9198667f5213e0da09af8', // SwitchCase - The No Nonsense Bar Cube
            'a71be443-3aef-424a-bc37-64af56b6c1e7', // LuckyLooter - Museum of Modern
            '6122a60ae66c4a105041808a', // Jeff1060 - Old Border Foil Cube
            '3a14b3a0-28f3-4a99-9403-05bb930c7846', // PrestonL - Nomad Micro
            'bbf6cec1-d955-4f75-82dd-40d4ff45b343', // LSVCube - LSV's Retro Cube
            '5db72d91d4a35c1294819945', // dsbcubes - Ancient Times
            '61e090395cd6410ff6d18b5a', // Longnaps - 1v1 Jumpstart EDH
            'c1e7f5ff-7bc5-4268-b8b3-c6e2735e346a', // vertigo451 - LOTR Cube
            'ef9deff3-c05a-4dc1-a43e-45ad0990e784', // Zennith - The Arena Powered Cube
            '5e99affb319c431018010d56', // ScenicStump - The Horror Of Innistrad
            '60520b18b187bd105a2323a3', // CatParty - Ye Old Vintage Cube
            '5e52c7c887d68470ced0c4cd', // mahjerion - Easy-To-Understand Commander Cube (480 + 90 Commanders)
            '5deef8c7782ed239f581700c', // loxeylol - Pauper Pimp Cube
            '5fc9e578bada5f7f15feb582', // aquaone - aquaone powered
            'b6ce3845-d40c-4b34-9352-d003dde0e670', // MachineSchooling - Alpha Reimagined
            '5e53d7ce66a3546e863abc67', // matignon - Matignon's Cube, 360 unpowered
            '638f36c1ba43583a92f67677', // ChillMTG - Dragons of Winter's Night / Vorthos Desert Cube
            '70720b6f-b0f8-4ef4-8bfc-c620384f08ba', // pwndnoob - Reddit Daily Cube
            '5f7861a84f9e051049918d2e', // zoydraft - Pink Sleeves
        ],
    },
    {
        name: 'peasant',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 3,
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
        ],
    },
    {
        name: 'shoebox-2026',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
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
        name: 'cube-corner-2026',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        shardCount: 2,
        cubes: [
            '3c292cd9-e35c-474b-8bb1-dc926d0d43a3', // boomtak13 - Two Violins, a Drum and a Flute
            '88a6d45d-6c62-4600-aa84-e812aff37d49', // tentakelmonster - Some amount of Ornithopters
            '2eb1b1e5-0389-4799-9054-9207d724e899', // boomtak13 - Clone of The best of times, the worst of times
            'a9971dee-ebce-4f3f-9af3-ebfb61942c65', // dafuzetti - IPA-block cube
            '63d81aa162da200f69b5b90e', // rhythmicstudy - Means of Production
            '0210e511-c0b3-47a2-8502-9610a047d4a7', // rhythmicstudy - Improbable Alliances
            '049fa9c3-08c1-4560-a4d5-2d0e97aa307d', // boomtak13 - Prismatic Desert as featured at Magiccon Amsterdam!
            '2c025ad0-2d49-4eed-a6a0-32c0a4006c36', // D3nn4 - No Nonsense Cube
            '962ec01b-c119-484e-a1c0-e4e0eeebe7d1', // D3nn4 - Ghost of pioneer's past
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
];

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

            if (
                // If we're running in a CI Context, evaluate whether this is an execution that should evaluate Refreshes.
                refresh.toLowerCase() !== 'true'
                && isCI
            ) {
                console.log(`[${cubeId}] Skipping due to refresh policy...`);
                skip = true;
            } else if (
                // If we're in a refresh run, use date-based sharding to spread fetches across days.
                isCI
                && batch.shardCount !== undefined
                && index % batch.shardCount !== shardIndex % batch.shardCount
            ) {
                console.log(`[${cubeId}] Skipping due to sharding policy...`);
                skip = true;
            }

            const stats = fs.statSync(`./preloads/cubes/${cubeId}.json`);

            if (stats.size === 0 || (!skip && batch.staleThreshold && stats.mtimeMs <= batch.staleThreshold)) {
                console.log(`[${cubeId}] Local copy is stale or empty, fetching...`);
            } else {
                console.log(`[${cubeId}] Local copy is fresh, using cached version.`);
                const cube = JSON.parse(fs.readFileSync(`./preloads/cubes/${cubeId}.json`, 'utf-8'));
                batchResult[cubeId] = remapCube(cube, false);
                continue;
            }
        }

        try {
            const cube = await getCubeData(cubeId);
            fs.writeFileSync(`./preloads/cubes/${cubeId}.json`, JSON.stringify(cube, null, 2));
            batchResult[cubeId] = remapCube(cube, false);
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
