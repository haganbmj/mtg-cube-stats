import { defineConfig } from "vite";
import vue from '@vitejs/plugin-vue';

// Emits `<link rel="preload">` for the Scryfall cards JSON so the browser starts
// the ~10 MB (brotli) fetch during document parse rather than after the JS
// graph resolves. Only runs on production builds; dev is skipped because the
// hashed asset URL is unknown until bundling.
function cardsPreloadPlugin() {
    return {
        name: 'inject-cards-preload',
        transformIndexHtml(html, ctx) {
            if (!ctx.bundle) return html;
            const cardsAsset = Object.values(ctx.bundle).find(a =>
                a.type === 'asset' && a.name?.startsWith('cards-minimized') && a.fileName?.endsWith('.json'),
            );
            if (!cardsAsset) return html;
            const tag = `    <link rel="preload" as="fetch" href="/${cardsAsset.fileName}" crossorigin>\n`;
            return html.replace('</head>', `${tag}</head>`);
        },
    };
}

export default defineConfig({
    plugins: [vue(), cardsPreloadPlugin()],
    build: {
        sourcemap: true,
    },
    test: {
        environment: 'happy-dom',
        setupFiles: [
            './vitest.setup.mjs',
        ],
    },
    // Replacement values. These are set at build time.
    define: {
        'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
        'import.meta.env.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA ?? 'local'),
    },
});
