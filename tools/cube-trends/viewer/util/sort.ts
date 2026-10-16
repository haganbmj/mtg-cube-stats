// Nulls/undefined sort last regardless of direction (treated as -Infinity, flipped by the caller's order).
export function compareNullable(a: number | null | undefined, b: number | null | undefined): number {
    const av = a === null || a === undefined ? -Infinity : a;
    const bv = b === null || b === undefined ? -Infinity : b;
    if (av === bv) {
        return 0;
    }
    return av < bv ? -1 : 1;
}

export function byName(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
