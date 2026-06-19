const PRIMARY_TYPE_RANKING = ['Land', 'Creature', 'Artifact', 'Enchantment', 'Instant', 'Sorcery'];
const SUPERTYPES = new Set(['Legendary', 'Basic', 'Snow', 'World', 'Elite']);

/** Split a type line into its component types (before the em-dash, front face only). */
export function flatMapTypes(typeLine: string): string[] {
    // Some of the Spiderman cards are using the wrong dash character.
    return typeLine.replace('—', '-').split('//')[0].split('-')[0].trim().split(' ');
}

/** Determine the most significant type from a type line. */
export function primaryTypeOf(typeLine: string): string | undefined {
    const types = flatMapTypes(typeLine);
    for (const ranked of PRIMARY_TYPE_RANKING) {
        if (types.includes(ranked)) return ranked;
    }
    return types.find(t => !SUPERTYPES.has(t)) ?? types[0];
}
