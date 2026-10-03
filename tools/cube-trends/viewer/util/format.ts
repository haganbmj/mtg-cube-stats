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
