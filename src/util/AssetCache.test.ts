import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { loadJsonAsset, registerKnownAssetUrl, pruneUnknownAssets, _resetForTesting } from './AssetCache';

const seedAsset = async (url: string, family: string, data: unknown, fetchedAt: string) => {
    const { getDb, ASSETS_STORE } = await import('./CubeDb');
    const db = await getDb();
    await db.put(ASSETS_STORE, { url, family, data, fetchedAt });
    // Match production behaviour: consumers register their known URLs before loading.
    // Otherwise the auto-prune on first load deletes the seeded entry.
    registerKnownAssetUrl(url);
};

const seedAssetWithoutRegistering = async (url: string, family: string, data: unknown, fetchedAt: string) => {
    const { getDb, ASSETS_STORE } = await import('./CubeDb');
    const db = await getDb();
    await db.put(ASSETS_STORE, { url, family, data, fetchedAt });
};

const readAsset = async (url: string) => {
    const { getDb, ASSETS_STORE } = await import('./CubeDb');
    const db = await getDb();
    return db.get(ASSETS_STORE, url);
};

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('AssetCache', () => {
    beforeEach(async () => {
        await _resetForTesting();
        const { deleteDB } = await import('idb');
        await deleteDB('cube-cache');
        // @ts-expect-error test override
        globalThis.fetch = vi.fn();
    });

    it('fetches and stores on cold cache', async () => {
        const payload = { hello: 'world' };
        (globalThis.fetch as any).mockResolvedValue({ json: () => Promise.resolve(payload) });

        const result = await loadJsonAsset<typeof payload>('/assets/foo-abc.json', 'cards');

        expect(result).toEqual(payload);
        expect(globalThis.fetch).toHaveBeenCalledWith('/assets/foo-abc.json');
        const stored = await readAsset('/assets/foo-abc.json');
        expect(stored?.data).toEqual(payload);
        expect(stored?.family).toBe('cards');
    });

    it('returns cached data on exact URL hit without fetching', async () => {
        await seedAsset('/assets/foo-abc.json', 'cards', { cached: true }, new Date().toISOString());
        (globalThis.fetch as any).mockResolvedValue({ json: () => Promise.resolve({ fresh: true }) });

        const result = await loadJsonAsset<{ cached: boolean }>('/assets/foo-abc.json', 'cards');

        expect(result).toEqual({ cached: true });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('does not invoke onStale when the exact URL is cached', async () => {
        await seedAsset('/assets/foo-abc.json', 'cards', { cached: true }, new Date().toISOString());
        const onStale = vi.fn();

        await loadJsonAsset('/assets/foo-abc.json', 'cards', { onStale });
        await flushMicrotasks();

        expect(onStale).not.toHaveBeenCalled();
    });

    it('returns family fallback and refetches when the URL differs and onStale is provided', async () => {
        await seedAsset('/assets/foo-abc.json', 'cards', { version: 'stale' }, new Date().toISOString());
        (globalThis.fetch as any).mockResolvedValue({ json: () => Promise.resolve({ version: 'fresh' }) });
        const onStale = vi.fn();

        const result = await loadJsonAsset<{ version: string }>('/assets/foo-def.json', 'cards', { onStale });

        expect(result).toEqual({ version: 'stale' });
        // Give the background fetch a tick to resolve.
        await flushMicrotasks();
        await flushMicrotasks();
        expect(globalThis.fetch).toHaveBeenCalledWith('/assets/foo-def.json');
        expect(onStale).toHaveBeenCalledWith({ version: 'fresh' });
        const stored = await readAsset('/assets/foo-def.json');
        expect(stored?.data).toEqual({ version: 'fresh' });
    });

    it('blocks on fresh fetch when URL differs and onStale is omitted', async () => {
        await seedAsset('/assets/foo-abc.json', 'frequency', { version: 'stale' }, new Date().toISOString());
        (globalThis.fetch as any).mockResolvedValue({ json: () => Promise.resolve({ version: 'fresh' }) });

        const result = await loadJsonAsset<{ version: string }>('/assets/foo-def.json', 'frequency');

        expect(result).toEqual({ version: 'fresh' });
        expect(globalThis.fetch).toHaveBeenCalledWith('/assets/foo-def.json');
    });

    it('fetches when cache miss and no family match', async () => {
        (globalThis.fetch as any).mockResolvedValue({ json: () => Promise.resolve({ payload: 1 }) });

        const result = await loadJsonAsset('/assets/new.json', 'cards', { onStale: vi.fn() });

        expect(result).toEqual({ payload: 1 });
        expect(globalThis.fetch).toHaveBeenCalledWith('/assets/new.json');
    });

    it('propagates fetch errors on cache miss', async () => {
        (globalThis.fetch as any).mockRejectedValue(new Error('network down'));

        await expect(loadJsonAsset('/assets/x.json', 'cards')).rejects.toThrow('network down');
    });

    it('prunes assets whose URLs are not registered', async () => {
        await seedAssetWithoutRegistering('/assets/keep.json', 'cards', { keep: true }, new Date().toISOString());
        await seedAssetWithoutRegistering('/assets/drop1.json', 'frequency', { drop: true }, new Date().toISOString());
        await seedAssetWithoutRegistering('/assets/drop2.json', 'cardStats', { drop: true }, new Date().toISOString());

        registerKnownAssetUrl('/assets/keep.json');
        await pruneUnknownAssets();

        expect(await readAsset('/assets/keep.json')).toBeDefined();
        expect(await readAsset('/assets/drop1.json')).toBeUndefined();
        expect(await readAsset('/assets/drop2.json')).toBeUndefined();
    });
});
