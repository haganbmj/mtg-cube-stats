const SYMBOL_CLASS_MAP: Record<string, string> = {
    'W': 'w', 'U': 'u', 'B': 'b', 'R': 'r', 'G': 'g',
    'C': 'c', 'S': 's', 'E': 'e', 'P': 'p',
    'X': 'x', 'Y': 'y', 'Z': 'z',
    'T': 'tap', 'Q': 'untap',
    'CHAOS': 'chaos',
};

const escapeHtml = (str: string): string => {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const symbolToManaClass = (symbol: string): string | null => {
    const s = symbol.toUpperCase();
    if (SYMBOL_CLASS_MAP[s]) return SYMBOL_CLASS_MAP[s];
    if (s.includes('/')) {
        // Hybrid/Phyrexian: W/U -> wu, 2/W -> 2w, W/P -> wp
        return s.split('/').map(p => p.toLowerCase()).join('');
    }
    if (/^\d+$/.test(s) && parseInt(s) <= 20) return s;
    return null;
};

export const renderManaSymbols = (text: string): string => {
    return text.split(/(\{[^}]+\})/g).map(part => {
        const match = part.match(/^\{([^}]+)\}$/);
        if (match) {
            const cls = symbolToManaClass(match[1]);
            if (cls) return `<i class="ms ms-cost ms-${cls}" aria-label="${escapeHtml(part)}"></i>`;
        }
        return escapeHtml(part);
    }).join('');
};
