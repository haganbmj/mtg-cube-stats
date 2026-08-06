import axios from 'axios';

interface CubeCobraResponse {
    // This would be the raw CubeCobra API response structure
    // Type it fully when we have more detailed information about the response
    [key: string]: any;
}

/**
 * Extracts a cube identifier from raw user input. Accepts a bare short/long ID,
 * an ID with a timestamp suffix, or a CubeCobra URL (with or without trailing
 * slash and query string). Returns the input unchanged if no path segment
 * matches (shouldn't happen for non-empty input, but kept as a safe fallback).
 */
export function parseCubeIdInput(input: string): string {
    const trimmed = input.split('?')[0].trim();
    const match = trimmed.match(/([^\/]+)\/?$/);
    return match ? match[1] : trimmed;
}

// TODO: Handle errors...
export async function getCubeData(
    cubeId: string,
    options: { date?: number } = {},
): Promise<CubeCobraResponse> {
    const url = options.date
        ? `https://cubecobra.com/cube/api/cubeJSON/${cubeId}?date=${options.date}`
        : `https://cubecobra.com/cube/api/cubeJSON/${cubeId}`;
    try {
        const response = await axios({
            url,
            method: 'GET',
        });
        return response.data;
    } catch (e: any) {
        console.error(`Failed to fetch cube: ${cubeId}, status: ${e.status}. message: ${e.message}`);
        throw e;
    }
}

/**
 * Fetches the top N cube IDs from CubeCobra's search API, sorted by popularity descending.
 * Paginates automatically using the `lastKey` cursor returned by each response.
 */
export async function fetchTopCubeIds(count: number = 100): Promise<string[]> {
    const ids: string[] = [];
    let lastKey: object | null = null;

    while (ids.length < count) {
        const response = await axios({
            url: 'https://cubecobra.com/search/getmoresearchitems',
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            data: { query: '', order: 'pop', ascending: 'false', lastKey },
        });

        const data = response.data;
        const cubes: { id: string }[] = data.cubes ?? [];

        for (const cube of cubes) {
            if (ids.length >= count) break;
            if (cube.id) ids.push(cube.id);
        }

        if (!data.lastKey || cubes.length === 0) break;
        lastKey = data.lastKey;
    }

    return ids;
}
