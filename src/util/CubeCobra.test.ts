import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getCubeData, getCubeHistoryPage } from './CubeCobra';

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

    it('uses the changelog query parameter when provided', async () => {
        await getCubeData('abc', { changelog: 'f47ac10b-58cc' });
        expect(mockedAxios).toHaveBeenCalledWith({
            url: 'https://cubecobra.com/cube/api/cubeJSON/abc?changelog=f47ac10b-58cc',
            method: 'GET',
        });
    });
});

describe('getCubeHistoryPage', () => {
    const mockedAxios = vi.mocked(axios);

    beforeEach(() => {
        mockedAxios.mockReset();
        mockedAxios.mockResolvedValue({ data: { cubeId: 'abc', changelogs: [], nextCursor: undefined } } as any);
    });

    it('requests the history endpoint with a limit', async () => {
        await getCubeHistoryPage('abc');
        expect(mockedAxios).toHaveBeenCalledWith({
            url: 'https://cubecobra.com/cube/api/history/abc?limit=100',
            method: 'GET',
        });
    });

    it('passes the cursor when provided', async () => {
        await getCubeHistoryPage('abc', 'eyJpZCI6IngifQ');
        expect(mockedAxios).toHaveBeenCalledWith({
            url: 'https://cubecobra.com/cube/api/history/abc?limit=100&cursor=eyJpZCI6IngifQ',
            method: 'GET',
        });
    });
});
