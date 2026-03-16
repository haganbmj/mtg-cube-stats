import axios from 'axios';

interface CubeCobraResponse {
    // This would be the raw CubeCobra API response structure
    // Type it fully when we have more detailed information about the response
    [key: string]: any;
}

// TODO: Handle errors...
export async function getCubeData(cubeId: string): Promise<CubeCobraResponse> {
    try {
        const response = await axios({
            url: `https://cubecobra.com/cube/api/cubeJSON/${cubeId}`,
            method: 'GET',
        });
        return response.data;
    } catch (e: any) {
        console.error(`Failed to fetch cube: ${cubeId}, status: ${e.status}. message: ${e.message}`);
        throw e;
    }
}
