import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { build, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { parseArgs } from './args';
import { loadManifests } from '../manifests';
import { DEFAULT_OUTPUT_DIR } from '../output';

const GLOB_LITERAL = `'../output/*/*.json'`;
const MANIFEST_PATTERN = /^[A-Za-z0-9_-]+$/;

export function rewriteGlob(code: string, manifest: string): string {
    if (!MANIFEST_PATTERN.test(manifest)) {
        throw new Error(`Invalid manifest name: ${manifest}`);
    }
    if (!code.includes(GLOB_LITERAL)) {
        throw new Error(`Expected literal ${GLOB_LITERAL} not found in dataSource.ts`);
    }
    return code.replace(GLOB_LITERAL, `'../output/${manifest}/*.json'`);
}

export function reportPlugin(manifest: string): Plugin {
    return {
        name: 'trends-report-data',
        enforce: 'pre',
        transform(code, id) {
            if (id.endsWith('viewer/dataSource.ts')) {
                return rewriteGlob(code, manifest);
            }
        },
    };
}

// Vite emits the HTML nested under <outDir>/tools/cube-trends/index.html (path relative to root).
function flattenOutput(outDir: string): void {
    const nestedHtml = path.join(outDir, 'tools', 'cube-trends', 'index.html');
    fs.renameSync(nestedHtml, path.join(outDir, 'index.html'));
    fs.rmSync(path.join(outDir, 'tools'), { recursive: true, force: true });

    // Vite never inlines SVG assets referenced with a URL fragment (e.g. mana-font's
    // `#mana`/`#mplantin` glyph anchors), even with assetsInlineLimit raised. Those SVGs are
    // the legacy iOS<4.1 @font-face fallback; the woff/ttf formats earlier in the same src list
    // are already inlined and render fine, so the orphaned SVGs are safe to discard.
    const danglingSvgFont = /^(mana|mplantin)-[\w-]+\.svg$/;
    for (const entry of fs.readdirSync(outDir)) {
        if (entry !== 'index.html' && danglingSvgFont.test(entry)) {
            fs.rmSync(path.join(outDir, entry));
        }
    }

    const remaining = fs.readdirSync(outDir);
    if (remaining.length !== 1 || remaining[0] !== 'index.html') {
        throw new Error(`Unexpected contents in ${outDir}: ${remaining.join(', ')}`);
    }
}

async function buildReport(manifestName: string, outDir: string): Promise<void> {
    await build({
        configFile: path.resolve('vite.config.mjs'),
        root: process.cwd(),
        base: './',
        logLevel: 'warn',
        build: {
            outDir,
            emptyOutDir: true,
            sourcemap: false,
            assetsInlineLimit: Number.MAX_SAFE_INTEGER,
            rollupOptions: {
                input: path.resolve('tools/cube-trends/index.html'),
            },
        },
        plugins: [reportPlugin(manifestName), viteSingleFile()],
    });

    flattenOutput(outDir);
}

async function main(): Promise<void> {
    const { manifests: selection } = parseArgs(process.argv.slice(2));
    const manifests = await loadManifests(selection);

    for (const manifest of manifests) {
        const metaPath = path.join(DEFAULT_OUTPUT_DIR, manifest.name, 'meta.json');
        if (!fs.existsSync(metaPath)) {
            console.log(`[${manifest.name}] skipped; no output (run trends:analyze first)`);
            continue;
        }

        const outDir = path.join(DEFAULT_OUTPUT_DIR, manifest.name, 'report');
        await buildReport(manifest.name, outDir);
        console.log(`[${manifest.name}] report written to ${outDir}/index.html`);
    }
}

// Guarded so report.test.ts can import rewriteGlob/reportPlugin without triggering a build.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((err) => {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
}
