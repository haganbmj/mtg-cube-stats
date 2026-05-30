// src/util/useHashRouter.ts
export interface HashRouterState {
    tab: string;
    preset: string | null;
    cubes: string[];
    q: string;
    order: string | null;
    direction: string | null;
    compareA: string | null;
    compareB: string | null;
}

const VALID_TABS = ['overview', 'infographic', 'statistics', 'compare', 'cards', 'about'];

export function parseHash(hash: string): HashRouterState {
    // Expected: #/{tab}?{params} or empty
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const [pathPart, queryPart] = raw.split('?', 2);

    // Extract tab from path (strip leading slash)
    const tabCandidate = (pathPart || '').replace(/^\//, '').split('/')[0] || '';
    const tab = VALID_TABS.includes(tabCandidate) ? tabCandidate : 'overview';

    const params = new URLSearchParams(queryPart || '');

    return {
        tab,
        preset: params.get('preset') || null,
        cubes: params.get('cubes')?.split(',').filter(Boolean) || [],
        q: params.get('q') || '',
        order: params.get('order') || null,
        direction: params.get('direction') || null,
        compareA: params.get('a') || null,
        compareB: params.get('b') || null,
    };
}

export function serializeHash(state: HashRouterState): string {
    const params = new URLSearchParams();
    if (state.preset) {
        params.set('preset', state.preset);
    } else if (state.cubes.length > 0) {
        params.set('cubes', state.cubes.join(','));
    }
    if (state.q) params.set('q', state.q);
    if (state.order) params.set('order', state.order);
    if (state.direction) params.set('direction', state.direction);
    if (state.tab === 'compare') {
        if (state.compareA) params.set('a', state.compareA);
        if (state.compareB) params.set('b', state.compareB);
    }

    const query = params.toString();
    return `#/${state.tab}${query ? '?' + query : ''}`;
}

/**
 * Check for legacy query-string params (?preset= or ?cubes=) and migrate
 * them into the hash on first load.
 */
function migrateLegacyUrl(): string {
    const search = window.location.search;
    if (!search) return window.location.hash;

    const params = new URLSearchParams(search);
    const preset = params.get('preset');
    const cubes = params.get('cubes');

    if (preset || cubes) {
        const state: HashRouterState = {
            tab: 'overview',
            preset: preset || null,
            cubes: cubes?.split(',').filter(Boolean) || [],
            q: '',
            order: null,
            direction: null,
            compareA: null,
            compareB: null,
        };
        const hash = serializeHash(state);
        history.replaceState(null, '', window.location.pathname + hash);
        return hash;
    }
    return window.location.hash;
}

export function useHashRouter() {
    const hash = migrateLegacyUrl();
    const initialState = parseHash(hash);

    function syncToHash(state: HashRouterState): void {
        const newHash = serializeHash(state);
        if (newHash !== window.location.hash) {
            history.replaceState(null, '', window.location.pathname + newHash);
        }
    }

    function onHashChange(callback: (state: HashRouterState) => void): () => void {
        const handler = () => {
            callback(parseHash(window.location.hash));
        };
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }

    return { initialState, syncToHash, onHashChange };
}
