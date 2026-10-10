// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadManifests } from './manifests';

describe('loadManifests', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-temp-'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('throws error with valid names when unknown manifest is requested', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'a.ts'),
            `export default { name: 'a', label: 'A', fetch: null, cubes: ['x'] };`,
        );
        fs.writeFileSync(
            path.join(tempDir, 'b.ts'),
            `export default { name: 'b', label: 'B', fetch: null, cubes: ['y'] };`,
        );

        await expect(
            loadManifests(['unknown'], { manifestsDir: tempDir }),
        ).rejects.toThrow(/Unknown manifest.*unknown.*Valid manifests.*[ab]/);
    });

    it('selects normal manifest without needing top100 file', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'a.ts'),
            `export default { name: 'a', label: 'A', fetch: null, cubes: ['cube1', 'cube2'] };`,
        );

        const result = await loadManifests(['a'], { manifestsDir: tempDir });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('a');
        expect(result[0].cubes).toEqual(['cube1', 'cube2']);
    });

    it('resolves manifest with top100 source from json file', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'top100.ts'),
            `export default { name: 'top100', label: 'Top 100', fetch: { source: 'cubecobra-top100' }, cubes: [] };`,
        );

        const top100JsonPath = path.join(tempDir, 'top100-ids.json');
        fs.writeFileSync(top100JsonPath, JSON.stringify(['id1', 'id2', 'id3']));

        const result = await loadManifests(['top100'], {
            manifestsDir: tempDir,
            top100Path: top100JsonPath,
        });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('top100');
        expect(result[0].cubes).toEqual(['id1', 'id2', 'id3']);
    });

    it('throws clear error when top100 manifest needs missing json file', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'top100.ts'),
            `export default { name: 'top100', label: 'Top 100', fetch: { source: 'cubecobra-top100' }, cubes: [] };`,
        );

        const missingPath = path.join(tempDir, 'missing-top100-ids.json');

        await expect(
            loadManifests(['top100'], { manifestsDir: tempDir, top100Path: missingPath }),
        ).rejects.toThrow(
            /Manifest "top100" needs preloads\/cache\/cubecobra-top100-ids\.json — run npm run preload first\./,
        );
    });

    it('selects all manifests and resolves only those with top100 source', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'a.ts'),
            `export default { name: 'a', label: 'A', fetch: null, cubes: ['x'] };`,
        );
        fs.writeFileSync(
            path.join(tempDir, 'top100.ts'),
            `export default { name: 'top100', label: 'Top 100', fetch: { source: 'cubecobra-top100' }, cubes: [] };`,
        );

        const top100JsonPath = path.join(tempDir, 'top100-ids.json');
        fs.writeFileSync(top100JsonPath, JSON.stringify(['id1', 'id2']));

        const result = await loadManifests('all', {
            manifestsDir: tempDir,
            top100Path: top100JsonPath,
        });

        expect(result).toHaveLength(2);
        const manifests = new Map(result.map((m) => [m.name, m]));
        expect(manifests.get('a')!.cubes).toEqual(['x']);
        expect(manifests.get('top100')!.cubes).toEqual(['id1', 'id2']);
    });

    it('skips types.ts, filters.ts, and *.test.ts files', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'types.ts'),
            `export default { name: 'types', label: 'Types', fetch: null, cubes: [] };`,
        );
        fs.writeFileSync(
            path.join(tempDir, 'filters.ts'),
            `export default { name: 'filters', label: 'Filters', fetch: null, cubes: [] };`,
        );
        fs.writeFileSync(
            path.join(tempDir, 'x.test.ts'),
            `export default { name: 'x', label: 'X', fetch: null, cubes: [] };`,
        );
        fs.writeFileSync(
            path.join(tempDir, 'a.ts'),
            `export default { name: 'a', label: 'A', fetch: null, cubes: ['x'] };`,
        );

        const result = await loadManifests('all', { manifestsDir: tempDir });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('a');
    });

    it('throws naming the bad manifest when a name has unsafe characters', async () => {
        fs.writeFileSync(
            path.join(tempDir, 'bad.ts'),
            `export default { name: 'bad/../name', label: 'Bad', fetch: null, cubes: [] };`,
        );

        await expect(
            loadManifests('all', { manifestsDir: tempDir }),
        ).rejects.toThrow(/Invalid manifest name "bad\/\.\.\/name"/);
    });
});
