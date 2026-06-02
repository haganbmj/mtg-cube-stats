export const rarityOrder: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    mythic: 4,

    special: 3,
    bonus: 3,
};

export const rarityColors: Record<string, string> = {
    common: '#5a5a5a',
    uncommon: '#3a7a94',
    rare: '#9a7a10',
    mythic: '#b34510',
    special: '#7a3d99',
    bonus: '#7a3d99',
};

export function getRarityColor(rarity: string): string | undefined {
    return rarityColors[rarity?.toLowerCase()];
}

export function getNestedProp(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

export function capitalizeFirstLetter(str: string): string {
    if (typeof str !== 'string' || str.length === 0) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function castInensitiveSort(a: any, b: any): number {
    const aStr = (a ?? '').toString().normalize('NFKD');
    const bStr = (b ?? '').toString().normalize('NFKD');
    return aStr.localeCompare(bStr, undefined, { sensitivity: 'base' });
}

export function normalizeSortName(str: string): string {
    return str
        .trim()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/["""'''«»‹›]/g, '')
        .replace(/^(a|an|the)\s+/i, '');
}

export function formatPrice(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
