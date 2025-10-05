import fs from 'fs';
import axios from 'axios';
import { remapCube } from './src/util/CubeFunctions.mjs';

const batches = {
    "haganbmj": [
        '5d5f69612af66a30f9bb9b10', // Peasant
        '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // Kuleshov
    ],
    "peasantDiscord": [

    ],
};

async function getCube(id) {
    const resp = await axios({
        url: `https://cubecobra.com/cube/api/cubeJSON/${id}`,
        method: 'GET',
        headers: {
            'User-Agent': 'Griselbrand/0.1.0',
        },
    });

    return remapCube(resp.data);
}

for (const batch of Object.keys(batches)) {
    const batchResult = {};
    for (const cubeId of batches[batch]) {
        console.log(`Fetching cube ${cubeId}...`);
        const cube = await getCube(cubeId);
        batchResult[cubeId] = cube;
        console.log(`Fetched cube ${cubeId}.`);
    }
    fs.writeFileSync(`./data/cubes-${batch}.json`, JSON.stringify(batchResult, null, 2));
    console.log(`Wrote batch ${batch} to file.`);
}
