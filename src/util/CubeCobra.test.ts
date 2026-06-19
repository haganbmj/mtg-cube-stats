import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getCubeData } from './CubeCobra';

vi.mock('axios');

describe('getCubeData', () => {
    const mockedAxios = vi.mocked(axios);

    beforeEach(() => {
        mockedAxios.mockReset();
        mockedAxios.mockResolvedValue({ data: { id: 'abc' } } as any);
    });

    it('omits the date query parameter when not provided', async () => {
        await getCubeData('abc');
        expect(mockedAxios).toHaveBeenCalledWith({
            url: 'https://cubecobra.com/cube/api/cubeJSON/abc',
            method: 'GET',
        });
    });

    it('includes the date query parameter when provided', async () => {
        await getCubeData('abc', { date: 1566534018025 });
        expect(mockedAxios).toHaveBeenCalledWith({
            url: 'https://cubecobra.com/cube/api/cubeJSON/abc?date=1566534018025',
            method: 'GET',
        });
    });
});
