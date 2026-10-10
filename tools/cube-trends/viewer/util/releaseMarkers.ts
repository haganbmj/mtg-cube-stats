import type { SetInfo } from '../../analysis/context';

// Sets released on the same date share one line, labeled e.g. `msh/msc`, to avoid overlapping labels.
export function releaseMarkLines(markers: SetInfo[]): object {
    const byDate = new Map<number, SetInfo[]>();
    for (const marker of markers) {
        const group = byDate.get(marker.releasedAt) ?? [];
        group.push(marker);
        byDate.set(marker.releasedAt, group);
    }

    const fullNames = new Map<string, string>();
    const data = [...byDate.entries()]
        .sort(([a], [b]) => a - b)
        .map(([releasedAt, group]) => {
            // Name order puts a main set before its variants (e.g. "X" before "X Commander").
            const sorted = [...group].sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
            const label = sorted.map((m) => m.code.toUpperCase()).join('/');
            fullNames.set(label, sorted.map((m) => `${m.name} (${m.code.toUpperCase()})`).join(', '));
            return { xAxis: releasedAt, name: label };
        });

    return {
        symbol: 'none',
        lineStyle: { color: '#909399', type: 'dashed' },
        label: {
            formatter: (params: { name: string }) => params.name,
            color: '#909399',
        },
        tooltip: { formatter: (params: { name: string }) => fullNames.get(params.name) ?? params.name },
        data,
    };
}
