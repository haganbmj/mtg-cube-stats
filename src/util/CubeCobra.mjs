import axios from 'axios';

// TODO: Handle errors...
export async function getCubeData(cubeId) {
    return (await axios({
        url: `https://cubecobra.com/cube/api/cubeJSON/${cubeId}`,
        method: 'GET',
    })).data;
}
