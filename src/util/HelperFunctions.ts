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
