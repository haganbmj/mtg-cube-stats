import axios from 'axios';

// TODO: Handle errors...
export async function getCubeData(cubeId) {
    try {
        return (await axios({
            url: `https://cubecobra.com/cube/api/cubeJSON/${cubeId}`,
            method: 'GET',
        })).data;
    } catch (e) {
        console.error(`Failed to fetch cube: ${cubeId}, status: ${e.status}. message: ${e.message}`);
        throw e;
    }
}
