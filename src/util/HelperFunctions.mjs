export function getNestedProp(obj, path) {
    return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

export function capitalizeFirstLetter(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function castInensitiveSort(a, b) {
    const aStr = (a ?? '').toString().toLowerCase();
    const bStr = (b ?? '').toString().toLowerCase();
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
};
