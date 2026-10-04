export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function formatCount(value: number): string {
    return value.toFixed(2);
}

export function formatMomentum(value: number | null): string {
    if (value === null) {
        return '—';
    }
    const pointsPerMonth = value * 100;
    const sign = pointsPerMonth >= 0 ? '+' : '';
    return `${sign}${pointsPerMonth.toFixed(1)} pp/30d`;
}

export function formatDate(ms: number | null): string {
    if (ms === null) {
        return '—';
    }
    return new Date(ms).toISOString().slice(0, 10);
}

export function formatPercentTooltip(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }
    const fixed = (value * 100).toFixed(2);
    const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
    return `${trimmed}%`;
}

export function formatDays(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }
    const days = Math.round(value);
    return `${days} day${days === 1 ? '' : 's'}`;
}

interface BandTooltipLine {
    seriesName: string;
    format: (v: number) => string;
}

interface BandTooltipBand {
    q1: (index: number) => number | null;
    q3: (index: number) => number | null;
    format: (v: number) => string;
}

// ECharts axis-tooltip formatter for a median line + transparent Q1/IQR band chart.
export function bandTooltip(opts: { lines: BandTooltipLine[]; band: BandTooltipBand }): (params: any[]) => string {
    return (params) => {
        const rows = [formatDate(params[0].axisValue)];
        for (const line of opts.lines) {
            const param = params.find((p) => p.seriesName === line.seriesName);
            const raw = Array.isArray(param?.value) ? param.value[1] : param?.value;
            if (raw === null || raw === undefined) {
                continue;
            }
            rows.push(`${param.marker}${param.seriesName}: ${line.format(raw)}`);
        }
        const index = params[0].dataIndex;
        const q1 = opts.band.q1(index);
        const q3 = opts.band.q3(index);
        if (q1 !== null && q3 !== null) {
            rows.push(`25th–75th pct: ${opts.band.format(q1)} – ${opts.band.format(q3)}`);
        }
        return rows.join('<br/>');
    };
}
