const ARCHETYPE_DEFINITIONS = {
    'Artifacts Matter': {
        description: 'Effects that care about artifacts or artifact synergies',
        color: '#8C7853',
        detectBy: {
            tags: ['artifactfall', 'artifactify', 'synergy-artifact', 'synergy-artifact-*', 'tutor-artifact'],
            keywords: ['affinity-for-artifacts', 'improvise', 'fabricate']
        },
        threshold: 8
    },
    'Enchantments Matter': {
        description: 'Effects focusing on enchantments',
        color: '#9C27B0',
        detectBy: {
            tags: ['enchantmentfall', 'enchantmentize', 'synergy-enchantment', 'synergy-enchantment-*', 'tutor-enchantment', 'enchantment-engine'],
            keywords: ['constellation', 'waterbend']
        },
        threshold: 5
    },
    'Graveyard Value': {
        description: 'Effects that utilize the graveyard as a resource',
        color: '#4A4A4A',
        detectBy: {
            tags: ['graveyard-fuel', 'graveyard-fuel-*'],
            keywords: ['flashback', 'dredge', 'delve', 'escape', 'disturb', 'unearth', 'delirium', 'threshold', 'jump-start']
        },
        threshold: 6
    },
    'Token Generators': {
        description: 'Effects that repeatedly create tokens, or create additional tokens',
        color: '#F4D03F',
        detectBy: {
            tags: ['repeatable-token-generator', 'repeatable-*-tokens'],
            keywords: ['populate']
        },
        threshold: 8
    },
    'Spells Matter': {
        description: 'Effects that reward casting spells',
        color: '#3498DB',
        detectBy: {
            tags: ['synergy-noncreature', 'synergy-instant', 'synergy-sorcery'],
            keywords: ['prowess', 'storm']
        },
        threshold: 6
    },
    'Sacrifice/Aristocrats': {
        description: 'Effects built around sacrificing permanents',
        color: '#8E44AD',
        detectBy: {
            tags: ['sacrifice-outlet', 'blood-artist-ability', 'synergy-sacrifice', 'death-trigger', 'leaves-body-behind'],
            keywords: ['afterlife', 'undying', 'persist']
        },
        threshold: 6
    },
    'Lifegain': {
        description: 'Effects that gain life or benefit from lifegain',
        color: '#F8F9FA',
        detectBy: {
            tags: ['lifegain', 'lifegain-matters', 'lifegain-increaser'],
            keywords: ['lifelink']
        },
        threshold: 5
    },
    'Counters Matter': {
        description: 'Effects involving +1/+1 counters or other counters',
        color: '#27AE60',
        detectBy: {
            tags: ['counter-fuel', 'counters-matter', 'remove-counters', 'gives-pp-counters'],
            keywords: ['modular', 'graft', 'undying', 'persist', 'evolve', 'adapt', 'proliferate']
        },
        threshold: 6
    },
    'Ramp': {
        description: 'Various types of mana acceleration',
        color: '#229954',
        detectBy: {
            tags: ['ramp'],
        },
        threshold: 8
    },
    // 'Card Draw': {
    //     description: 'Card draw/advantage',
    //     color: '#3F51B5',
    //     detectBy: {
    //         tags: ['draw', 'card-advantage']
    //     },
    //     threshold: 10
    // },
    'Draw Matters': {
        description: 'Effects that care about drawing cards',
        color: '#3F51B5',
        detectBy: {
            tags: ['draw-matters', 'second-draw-matters']
        },
        threshold: 5
    },
    'Tribal Synergies': {
        description: 'Effects that care about creature types',
        color: '#FF7043',
        detectBy: {
            tags: ['tribal', 'creature-type-matters']
        },
        threshold: 4
    },
    'Mill/Self-Mill': {
        description: 'Effects that mill cards from libraries as a strategy',
        color: '#607D8B',
        detectBy: {
            tags: ['mill', 'graveyard-fuel-self', 'mill-self', 'mill-target']
        },
        threshold: 4
    },
    'Lands Matter': {
        description: 'Effects that care about lands',
        color: '#8D6E63',
        detectBy: {
            tags: ['lands-matter', 'landfall', 'land-animate', 'land-count-matters', 'land-etb'],
            keywords: ['landfall', 'domain']
        },
        threshold: 6
    },
    'Energy': {
        description: 'Effects utilizing energy',
        color: '#FBC02D',
        detectBy: {
            tags: ['energy-generator', 'counter-fuel-energy']
        },
        threshold: 4
    },
    'Equipment': {
        description: 'Effects focused on equipment',
        color: '#757575',
        detectBy: {
            tags: ['synergy-equipment', 'quick-equip'],
            keywords: ['equip', 'living weapon']
        },
        threshold: 5
    },
    'Flicker': {
        description: 'Effects that flicker for value',
        color: '#00BCD4',
        detectBy: {
            tags: ['flicker']
        },
        threshold: 6
    },
    'Reanimation': {
        description: 'Bringing stuff back from the graveyard to play',
        color: '#2C1810',
        detectBy: {
            tags: ['reanimate', 'creature-reanimation-automatic', 'temporary-reanimation', 'mass-reanimation']
        },
        threshold: 4
    },
    'Auras': {
        description: 'Enchant/Bestow and things that care about auras',
        color: '#9575CD',
        detectBy: {
            tags: ['synergy-aura', 'tutor-enchantment-aura'],
            keywords: ['enchant', 'bestow']
        },
        threshold: 4
    },
    'Storm': {
        description: 'Cards with the literal Storm mechanic',
        color: '#1976D2',
        detectBy: {
            keywords: ['storm']
        },
        threshold: 3
    },
    'Madness/Self-Discard': {
        description: 'Effects that discard or care about discarding cards',
        color: '#7B1FA2',
        detectBy: {
            tags: ['madness', 'discard-outlet', 'self-discard-matters', 'synergy-discard-self'],
            keywords: ['madness']
        },
        threshold: 4
    },
    'Sneak': {
        description: 'Putting creatures into play from hand without paying costs',
        color: '#D84315',
        detectBy: {
            tags: ['sneak', 'sneak-*']
        },
        threshold: 3
    },
    'Morph': {
        description: 'Cards that interact with face-down creatures or morph',
        color: '#616161',
        detectBy: {
            tags: ['face-up-face-down-effects', 'face-down-face-up-effects', 'turn-face-*'],
            keywords: ['morph', 'manifest', 'manifest dread', 'cloak', 'megamorph']
        },
        threshold: 4
    }
};

/**
 * Detects which archetypes a single card supports
 * @param {Object} card - Card object with tags and keywords
 * @returns {Array} Array of archetype names that this card supports
 */
export function detectCardArchetypes(card) {
    const supportedArchetypes = [];

    Object.entries(ARCHETYPE_DEFINITIONS).forEach(([archetypeName, archetype]) => {
        let supportsArchetype = false;

        // Check tags
        if (archetype.detectBy.tags) {
            supportsArchetype = supportsArchetype ||
                archetype.detectBy.tags.some(tag => {
                    if (tag.includes('*')) {
                        // Wildcard matching - convert * to regex pattern
                        const regexPattern = tag.toLowerCase().replace(/\*/g, '.*');
                        const regex = new RegExp(`^${regexPattern}$`);
                        return card.tags?.some(cardTag => regex.test(cardTag.toLowerCase()));
                    } else {
                        // Exact matching
                        return card.tags?.some(cardTag => cardTag.toLowerCase() === tag.toLowerCase());
                    }
                });
        }

        // Check keywords
        if (archetype.detectBy.keywords) {
            supportsArchetype = supportsArchetype ||
                archetype.detectBy.keywords.some(keyword =>
                    card.keywords?.some(cardKeyword => cardKeyword.toLowerCase() === keyword.toLowerCase())
                );
        }

        if (supportsArchetype) {
            supportedArchetypes.push(archetypeName);
        }
    });

    return supportedArchetypes;
}

/**
 * Aggregates pre-computed archetype data from cards (new approach)
 * @param {Array} cards - Array of cube card objects with pre-computed archetypes
 * @returns {Array} Array of aggregated archetype objects with support counts
 */
export function detectCubeArchetypes(cards) {
    const archetypeSupport = {};

    // Initialize archetype counters
    Object.keys(ARCHETYPE_DEFINITIONS).forEach(archetype => {
        archetypeSupport[archetype] = {
            count: 0,
            cards: [],
            ...ARCHETYPE_DEFINITIONS[archetype]
        };
    });

    // Aggregate archetype data from cards that have pre-computed archetypes
    cards.forEach(card => {
        if (card.archetypes && Array.isArray(card.archetypes)) {
            card.archetypes.forEach(archetypeName => {
                if (archetypeSupport[archetypeName]) {
                    archetypeSupport[archetypeName].count++;
                    archetypeSupport[archetypeName].cards.push(card.name);
                }
            });
        }
    });

    // Filter archetypes that have at least one supporting card and add support level
    const supportedArchetypes = Object.entries(archetypeSupport)
        .map(([name, data]) => ({
            name,
            ...data,
            supported: data.count >= data.threshold,
            supportLevel: getSupportLevel(data.count, data.threshold),
            percentage: ((data.count / cards.length) * 100).toFixed(1)
        }))
        .filter(archetype => archetype.count > 0)
        .sort((a, b) => b.count - a.count);

    return supportedArchetypes;
}

/**
 * Determines the support level for an archetype
 * @param {number} count - Number of supporting cards
 * @param {number} threshold - Minimum threshold for support
 * @returns {string} Support level description
 */
function getSupportLevel(count, threshold) {
    if (count < threshold * 0.5) return 'Minimal';
    if (count < threshold) return 'Light';
    if (count < threshold * 1.5) return 'Moderate';
    if (count < threshold * 2.5) return 'Strong';
    return 'Extensive';
}

/**
 * Gets color coding for support levels
 * @param {string} supportLevel - Support level string
 * @returns {string} CSS color class
 */
export function getSupportLevelColor(supportLevel) {
    switch (supportLevel) {
        case 'Minimal': return '#E0E0E0';
        case 'Light': return '#FFB74D';
        case 'Moderate': return '#81C784';
        case 'Strong': return '#4FC3F7';
        case 'Extensive': return '#9575CD';
        default: return '#E0E0E0';
    }
}
