import axios from 'axios';
import * as readline from 'readline';

// Usage:
// 1. Open https://cubecon.org/cubes/2026 in a browser
// 2. Run this in the browser console:
//    var a = []; document.querySelectorAll('h5 a[href*="cubecobra.com/cube/overview/"]').forEach(e => { const id = e.href.split("/cube/overview/")[1]; if (id && !a.some(x => x.startsWith(id))) a.push(id + "\t" + e.textContent.trim()); }); copy(a.join("\n"));
//
// For https://cubecon.org/vote (Future Polls, grouped by voting day):
//    var r = []; var group = ""; document.querySelectorAll("h2, h4, h5").forEach(e => { if (e.tagName === "H2") { if (e.textContent.includes("Past Polls")) group = ""; } if (e.tagName === "H4") { const t = e.textContent.trim(); group = t.startsWith("2026") ? t : ""; } if (e.tagName === "H5" && group) { const a = e.querySelector('a[href*="cubecobra.com/cube/overview/"]'); if (a) { const id = a.href.split("/cube/overview/")[1]; if (id && !r.some(x => x === group + "\t" + id + "\t" + a.textContent.trim())) r.push(group + "\t" + id + "\t" + a.textContent.trim()); } } }); copy(r.join("\n")); console.log(r.join("\n"));
// 3. Paste results and pipe into this script:
//    pbpaste | npx tsx download-cubecon-ids.ts

// A UUID-style ID (hex with dashes) or a MongoDB ObjectId (24 hex chars) doesn't need resolution.
const PROPER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9a-f]{24}$/;

async function resolveCubeId(idOrShortId: string): Promise<{ id: string; name: string }> {
    const response = await axios({
        url: `https://cubecobra.com/cube/api/cubeJSON/${idOrShortId}`,
        method: 'GET',
    });
    return { id: response.data.id, name: response.data.name };
}

async function readStdin(): Promise<string[]> {
    const rl = readline.createInterface({ input: process.stdin });
    const lines: string[] = [];
    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed) lines.push(trimmed);
    }
    return lines;
}

async function main() {
    const lines = await readStdin();
    if (lines.length === 0) {
        console.error('No input received. Paste browser console output via stdin.');
        console.error('Example: pbpaste | npx tsx download-cubecon-ids.ts');
        process.exit(1);
    }

    console.error(`Processing ${lines.length} entries...`);

    // Detect grouped format (3+ tab-separated columns: "group\tid\tname")
    const isGrouped = lines.some(l => l.split('\t').length >= 3 && l.split('\t')[0].startsWith('2026'));

    if (isGrouped) {
        const groups = new Map<string, { id: string; name: string }[]>();
        for (const line of lines) {
            const parts = line.split('\t');
            const group = parts[0].trim();
            const rawId = parts[1]?.trim();
            const name = parts.slice(2).join('\t').trim();
            if (!rawId || !group) continue;

            if (!groups.has(group)) groups.set(group, []);
            let id = rawId;
            if (!PROPER_ID_RE.test(id)) {
                console.error(`  Resolving short ID: ${id}`);
                try {
                    const resolved = await resolveCubeId(id);
                    id = resolved.id;
                } catch (e: any) {
                    console.error(`  Failed to resolve ${id}: ${e.message}`);
                    id = id + ' // UNRESOLVED';
                }
            }
            const existing = groups.get(group)!;
            if (!existing.some(x => x.id === id)) {
                existing.push({ id, name });
            }
        }

        for (const [group, cubes] of groups) {
            console.log(`// ${group}`);
            for (const { id, name } of cubes) {
                console.log(`'${id}', // ${name}`);
            }
            console.log('');
        }
    } else {
        const results: { id: string; name: string }[] = [];
        for (const line of lines) {
            // Expected format: "id\tCube Name" or just "id"
            const [rawId, ...nameParts] = line.split('\t');
            const id = rawId.trim();
            if (!id) continue;
            const name = nameParts.join('\t').trim();

            if (PROPER_ID_RE.test(id)) {
                results.push({ id, name });
            } else {
                console.error(`  Resolving short ID: ${id}`);
                try {
                    const resolved = await resolveCubeId(id);
                    results.push({ id: resolved.id, name: resolved.name });
                } catch (e: any) {
                    console.error(`  Failed to resolve ${id}: ${e.message}`);
                    results.push({ id, name: name + ' (UNRESOLVED)' });
                }
            }
        }

        // Output in batch array format
        for (const { id, name } of results) {
            console.log(`'${id}', // ${name}`);
        }
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
