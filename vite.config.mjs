import { defineConfig } from "vite";
import vue from '@vitejs/plugin-vue';

// Emits an inline script that conditionally injects `<link rel="preload">` for
// the Scryfall cards JSON so the browser starts the ~10 MB (brotli) fetch
// during document parse rather than after the JS graph resolves. The preload
// is skipped when a localStorage flag indicates the client already has the
// cards in IndexedDB (return visitors); this avoids wasted bandwidth and the
// "resource was preloaded but not used" console warning. Only runs on
// production builds; dev is skipped because the hashed asset URL is unknown
// until bundling.
function cardsPreloadPlugin() {
    return {
        name: 'inject-cards-preload',
        transformIndexHtml(html, ctx) {
            if (!ctx.bundle) return html;
            const cardsAsset = Object.values(ctx.bundle).find(a =>
                a.type === 'asset' && a.name?.startsWith('cards-minimized') && a.fileName?.endsWith('.json'),
            );
            if (!cardsAsset) return html;
            const href = `/${cardsAsset.fileName}`;
            const script = `    <script>(function(){try{if(localStorage.getItem('mtg-cube-stats:cards-cached')==='1')return;}catch(e){}var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href=${JSON.stringify(href)};document.head.appendChild(l);})();<\/script>\n`;
            return html.replace('</head>', `${script}</head>`);
        },
    };
}

// Emits an inline script that reads location.hash, extracts ?preset=name, and
// injects a `<link rel="modulepreload">` for that preset's similarity chunk.
// The browser starts fetching the ~500 KB similarity module during document
// parse instead of waiting for onMounted → loadCollection to fire the dynamic
// import. Dev is skipped.
function similarityPreloadPlugin() {
    return {
        name: 'inject-similarity-preload',
        transformIndexHtml(html, ctx) {
            if (!ctx.bundle) return html;
            const manifest = {};
            for (const chunk of Object.values(ctx.bundle)) {
                if (chunk.type !== 'chunk') continue;
                const simModuleId = (chunk.moduleIds ?? []).find(id => id.includes('/preloads/generated/similarities/') && id.endsWith('.json'));
                if (!simModuleId) continue;
                const match = simModuleId.match(/\/similarities\/([^/]+)\.json$/);
                if (!match) continue;
                manifest[match[1]] = '/' + chunk.fileName;
            }
            if (Object.keys(manifest).length === 0) return html;

            const script = `    <script>(function(){var m=location.hash.match(/[?&]preset=([^&]+)/);if(!m)return;var p=decodeURIComponent(m[1]);var u=(${JSON.stringify(manifest)})[p];if(!u)return;var l=document.createElement('link');l.rel='modulepreload';l.href=u;document.head.appendChild(l);})();<\/script>\n`;
            return html.replace('</head>', `${script}</head>`);
        },
    };
}

export default defineConfig({
    plugins: [vue(), cardsPreloadPlugin(), similarityPreloadPlugin()],
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
