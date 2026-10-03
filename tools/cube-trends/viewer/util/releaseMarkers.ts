import type { SetInfo } from '../../analysis/context';

// Display the set code (short) on the line; full name is available via tooltip text.
export function releaseMarkLines(markers: SetInfo[]): object {
    return {
        symbol: 'none',
        lineStyle: { color: '#909399', type: 'dashed' },
        label: {
            formatter: (params: { name: string }) => params.name,
            color: '#909399',
        },
        data: markers.map((marker) => ({ xAxis: marker.releasedAt, name: marker.code })),
    };
}
