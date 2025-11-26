import fs from 'fs';
import { remapCube } from './src/util/CubeFunctions.mjs';
import { getCubeData } from './src/util/CubeCobra.mjs';

// Prefer using Cube IDs here rather than the user-defined short IDs that can change.
const batches = [
    {
        name: 'haganbmj',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        cubes: [
            '5d5f69612af66a30f9bb9b10', // Peasant
            '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // Kuleshov
            '4618ca9d-e359-4e85-b2fb-9e97720eb64c', // Twobert by Four
        ],
    },
    {
        name: 'wotc',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 7), // 7 days
        cubes: [
            '5d2cb3f44153591614458e5d', // MTGO Vintage Cube
            'ef9deff3-c05a-4dc1-a43e-45ad0990e784', // Arena Powered Cube
        ],
    },
    {
        name: 'peasant',
        staleThreshold: Date.now() - (1000 * 60 * 60 * 24 * 1), // 1 day
        cubes: [
            // Combination of Peasant Discord + a few others that I follow.
            '5d5f69612af66a30f9bb9b10', // haganbmj - The Ham Sandwich
            '61f51c3df1d9250f21664d1a', // AlfonsoGallegoF - 450 Peasant+
            '5d838062b656d33b0d553226', // ArBoR4817 - Peasant Cube
            '5ef783a507ee7f4bdce2bd3d', // CSabor9 - Peasant Cube
            '578d0a76-59b4-4414-a121-25676a2baf86', // villeneuve - Peasant Cube v1
            '63aa6dd3331aeb270eda1573', // daneelius - Daneelius's Peasant All Stars
            '1ecdc12c-d99e-465a-9bf0-1d68dfb8238e', // djsterlingsilva - Arena Peasant Twobert (@AA3)
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
            '5fa71a9957aea647df2480e8', // Squirrely - The Peasant Travel Cube
            '613bee1f5af537103e15d895', // Thetrufflehunter - Profoundly Peasant Cube
            'efd54fa5-39aa-4fe0-94b1-7d4d6e219a1f', // Trizeam - Trizeam's Peasant Cube
            '5e15392c09f9671fcb1dc6e0', // watertheweeds - 450 Peasant Cube
            '09eb35c7-3c13-4fa4-8035-6edc4cd295aa', // windston - Greenless peasant
            '742939f0-39da-4fe7-88f6-2f6d1cdc1775', // MoxYargle - We are all peasants now!
            '5e878d986f01105bb05f9df9', // Kattvalp - C/Ube
            '5d3ed83247586d63776acbf6', // sammich - Sammich's Peasant Cube
            '5e501a1b0304345db201ee2a', // mountainmage - Mountainmage's 100% Artist-Signed Peasant Cube
            '608fd59e0938891048b2490e', // BrownDog5117 - Peasantville !!!
            '6377de78946dbd0f6a6e8fff', // Emmmzyne - Peasant Cube (2025)
            '5d3f7245d1bbf667dd9d4286', // MatEffect - The Peasant Cube 2025
            '5d70f0322d52e15c2537f057', // Spootyone - The Spooty Peasant Cube - 2026 Edition
            '5e8c9f60a0c28578ee03de2d', // JankDiverGaming - Jank Diver Peasant Cube
            '5da9ff1872d31f3e1c1377ff', // CorakTM - Corak's Peasant Cube
            '5d5ed579726e4277c7bb1e32', // calibretto - Calibretto's Peasant Cube
        ],
    },
    {
        name: 'cubecon2025',
        staleThreshold: undefined,
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
            '5f57d887a382126d07eaddc3', // Sam’s Shiny Single Sided Cube
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
        console.log(`Skipping ${batch.name}`);
        continue;
    }

    const batchResult = {};
    for (const cubeId of batch.cubes) {
        console.log(`Fetching cube ${cubeId}...`);
        if (fs.existsSync(`./preloads/cubes/${cubeId}.json`)) {
            console.log(`Found local copy, loading from disk...`);
            const stats = fs.statSync(`./preloads/cubes/${cubeId}.json`);

            if (stats.size === 0 || stats.mtimeMs <= batch.staleThreshold) {
                console.log(`Local copy is stale or empty, re-fetching...`);
            } else {
                console.log(`Local copy is fresh, using cached version.`);
                const cube = JSON.parse(fs.readFileSync(`./preloads/cubes/${cubeId}.json`, 'utf-8'));
                batchResult[cubeId] = remapCube(cube, false);
                continue;
            }
        }

        try {
            const cube = await getCubeData(cubeId);
            console.log(`Fetched cube ${cubeId}, writing to disk...`);
            fs.writeFileSync(`./preloads/cubes/${cubeId}.json`, JSON.stringify(cube, null, 2));
            batchResult[cubeId] = remapCube(cube, false);
        } catch (e) {
            console.error(`Failed to fetch cube ${cubeId}: ${e.message}`);
            // FIXME: Should this fault here, or can we proceed then just error out at the end?
        }
    }
    fs.writeFileSync(`./preloads/cubes-${batch.name}.json`, JSON.stringify(batchResult, null, 2));
    console.log(`Wrote batch ${batch.name} to file.`);

    // Utility for logging out the Cube IDs.
    // Object.values(batchResult).forEach(cube => {
    //     console.log(`'${cube.id}', // ${cube.owner} - ${cube.name}`);
    // });
}
