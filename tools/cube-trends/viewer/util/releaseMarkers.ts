import type { SetInfo } from '../../analysis/context';

// Display the set code (short) on the line; full name is available via tooltip text.
export function releaseMarkLines(markers: SetInfo[]): object {
    return {
        symbol: 'none',
        label: {
            formatter: (params: { name: string }) => params.name,
        },
        data: markers.map((marker) => ({ xAxis: marker.releasedAt, name: marker.code })),
    };
}
