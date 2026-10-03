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

export function parseHash(hash: string): Route {
    const withoutPrefix = hash.replace(/^#\/?/, '');
    const queryIndex = withoutPrefix.indexOf('?');
    const pathPart = queryIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, queryIndex);
    const queryPart = queryIndex === -1 ? '' : withoutPrefix.slice(queryIndex + 1);

    const segments = pathPart.split('/').filter((segment) => segment.length > 0);
    const manifest = segments[0] !== undefined ? decodeURIComponent(segments[0]) : null;
    const rawView = segments[1] !== undefined ? decodeURIComponent(segments[1]) : 'overview';
    const view: ViewName = VIEW_SET.has(rawView) ? (rawView as ViewName) : 'overview';

    let card: string | null = null;
    if (queryPart.length > 0) {
        for (const pair of queryPart.split('&')) {
            const [key, value] = pair.split('=');
            if (key === 'card' && value !== undefined) {
                card = decodeURIComponent(value);
            }
        }
    }

    return { manifest, view, card };
}

export function buildHash(route: Route): string {
    const manifestSegment = encodeURIComponent(route.manifest ?? '');
    let hash = `#/${manifestSegment}/${encodeURIComponent(route.view)}`;
    if (route.card !== null) {
        hash += `?card=${encodeURIComponent(route.card)}`;
    }
    return hash;
}
