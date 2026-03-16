/**
 * Manually compiled this list, so might need to triple check it.
 * Goad is technically a "multiplayer" keyword?
 */
const evergreenKeywords: string[] = [
    'Goad',
    'Scry',
    'Mill',
    'Fight',
    'Deathtouch',
    'Defender',
    'Double strike',
    'Enchant',
    'Equip',
    'First strike',
    'Flash',
    'Flying',
    'Haste',
    'Hexproof',
    'Hexproof from',
    'Indestructible',
    'Lifelink',
    'Menace',
    'Reach',
    'Trample',
    'Vigilance',
    'Ward',
];

export function isEvergreenKeyword(word: string): boolean {
    return evergreenKeywords.includes(word);
}
