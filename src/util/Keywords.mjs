/**
 * Manually compiled this list, so might need to triple check it.
 * Goad is technically a "multiplayer" keyword?
 */
const evergreenKeywords = [
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

export function isEvergreenKeyword(word) {
  return evergreenKeywords.includes(word);
}
