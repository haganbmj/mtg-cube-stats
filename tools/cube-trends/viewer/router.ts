export const VIEWS = [
    'overview',
    'cards',
    'sets',
    'recency',
    'shape',
    'churn',
    'survival',
    'trendsetters',
    'homogenization',
    'substitutions',
    'consensus',
] as const;

export type ViewName = typeof VIEWS[number];

export interface Route {
    manifest: string | null;
    view: ViewName;
    card: string | null;
}

const VIEW_SET: ReadonlySet<string> = new Set(VIEWS);

// Malformed percent-encoding must not crash the viewer; treat it as absent.
function safeDecode(value: string): string | null {
    try {
        return decodeURIComponent(value);
    } catch {
        return null;
    }
}

export function parseHash(hash: string): Route {
    const withoutPrefix = hash.replace(/^#\/?/, '');
    const queryIndex = withoutPrefix.indexOf('?');
    const pathPart = queryIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, queryIndex);
    const queryPart = queryIndex === -1 ? '' : withoutPrefix.slice(queryIndex + 1);

    const segments = pathPart.split('/').filter((segment) => segment.length > 0);
    const manifest = segments[0] !== undefined ? safeDecode(segments[0]) : null;
    const rawView = segments[1] !== undefined ? safeDecode(segments[1]) : null;
    const view: ViewName = rawView !== null && VIEW_SET.has(rawView) ? (rawView as ViewName) : 'overview';

    let card: string | null = null;
    if (queryPart.length > 0) {
        for (const pair of queryPart.split('&')) {
            const [key, value] = pair.split('=');
            if (key === 'card' && value !== undefined) {
                card = safeDecode(value);
            }
        }
    }

    return { manifest, view, card };
}

export function buildHash(route: Route): string {
    let hash = '#/';
    if (route.manifest !== null) {
        hash += `${encodeURIComponent(route.manifest)}/${encodeURIComponent(route.view)}`;
    }
    if (route.card !== null) {
        hash += `?card=${encodeURIComponent(route.card)}`;
    }
    return hash;
}
