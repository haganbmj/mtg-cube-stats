export const rarityOrder: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    mythic: 4,

    special: 3,
    bonus: 3,
};

export const rarityColors: Record<string, string> = {
    common: 'rgba(160, 160, 160, 0.35)',
    uncommon: 'rgba(130, 185, 210, 0.45)',
    rare: 'rgba(210, 170, 30, 0.45)',
    mythic: 'rgba(225, 95, 35, 0.5)',
    special: 'rgba(175, 80, 210, 0.4)',
    bonus: 'rgba(175, 80, 210, 0.4)',
};

export function getRarityColor(rarity: string): string {
    return rarityColors[rarity?.toLowerCase()] ?? 'rgba(200, 200, 200, 0.3)';
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
    const aStr = (a ?? '').toString().toLowerCase();
    const bStr = (b ?? '').toString().toLowerCase();
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
}
