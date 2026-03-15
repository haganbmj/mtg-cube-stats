/**
 * Archetype detection logic for MTG cubes
 * Analyzes cards to identify supported themes and strategies
 */

// Define archetype patterns and their detection criteria
const ARCHETYPE_DEFINITIONS = {
    'Artifacts Matter': {
        description: 'Cards that care about artifacts or artifact synergies',
        color: '#8C7853',
        detectBy: {
            tags: ['artifactfall', 'artifactify', 'synergy-artifact', 'tutor-artifact'],
            keywords: ['affinity-for-artifacts', 'improvise', 'fabricate']
        },
        threshold: 8
    },
    'Graveyard Value': {
        description: 'Strategies that utilize the graveyard as a resource',
        color: '#4A4A4A',
        detectBy: {
            tags: ['graveyard-fuel'],
            keywords: ['flashback', 'dredge', 'delve', 'escape', 'disturb', 'unearth', 'delirium', 'threshold', 'jump-start']
        },
        threshold: 6
    },
    'Token Generators': {
        description: 'Creating and benefiting from token creatures',
        color: '#F4D03F',
        detectBy: {
            tags: ['repeatable-token-generator', 'repeatable-creature-tokens'],
            keywords: ['populate', 'convoke']
        },
        threshold: 8
    },
    'Spells Matter': {
        description: 'Cards that reward casting spells',
        color: '#3498DB',
        detectBy: {
            tags: ['synergy-noncreature', 'synergy-instant', 'synergy-sorcery'],
            keywords: ['prowess', 'storm']
        },
        threshold: 6
    },
    'Sacrifice/Aristocrats': {
        description: 'Strategies built around sacrificing permanents',
        color: '#8E44AD',
        detectBy: {
            tags: ['sacrifice-outlet', 'blood-artist-ability', 'synergy-sacrifice', 'death-trigger', 'leaves-body-behind'],
            keywords: ['afterlife', 'undying', 'persist']
        },
        threshold: 6
    },
    'Lifegain': {
        description: 'Cards that gain life or benefit from lifegain',
        color: '#F8F9FA',
        detectBy: {
            tags: ['lifegain', 'lifegain-matters', 'lifegain-increaser'],
            keywords: ['lifelink']
        },
        threshold: 5
    },
    'Counters Matter': {
        description: 'Strategies involving +1/+1 counters or other counters',
        color: '#27AE60',
        detectBy: {
            tags: ['counter'],
            keywords: ['modular', 'graft', 'undying', 'persist', 'evolve', 'adapt']
        },
        threshold: 6
    },
    'Ramp': {
        description: 'Accelerating mana development',
        color: '#229954',
        detectBy: {
            tags: ['ramp', 'lands-matter', 'landfall'],
        },
        threshold: 8
    },
    'Card Draw': {
        description: 'Card advantage and selection',
        color: '#3F51B5',
        detectBy: {
            tags: ['draw', 'scry', 'card-advantage']
        },
        threshold: 10
    },
    'Tribal Synergies': {
        description: 'Creature type synergies',
        color: '#FF7043',
        detectBy: {
            tags: ['tribal', 'creature-type-matters']
        },
        threshold: 4
    },
    'Enchantments Matter': {
        description: 'Strategies focusing on enchantments',
        color: '#9C27B0',
        detectBy: {
            tags: ['enchantmentfall', 'enchantment-removal'],
            keywords: ['constellation']
        },
        threshold: 5
    },
    'Mill/Self-Mill': {
        description: 'Milling cards from libraries as a strategy',
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
        description: 'Strategies utilizing energy counters',
        color: '#FBC02D',
        detectBy: {
            tags: ['energy-generator', 'counter-fuel-energy']
        },
        threshold: 4
    },
    'Equipment': {
        description: 'Strategies focused on equipment',
        color: '#757575',
        detectBy: {
            tags: ['synergy-equipment', 'quick-equip'],
            keywords: ['equip', 'living weapon']
        },
        threshold: 5
    },
    'Flicker': {
        description: 'Strategies that flicker for value',
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
        description: 'Enchant creature strategies and aura synergies',
        color: '#9575CD',
        detectBy: {
            tags: ['synergy-aura', 'tutor-enchantment-aura'],
            keywords: ['enchant', 'bestow']
        },
        threshold: 4
    },
    'Storm': {
        description: 'The actual Storm mechanic',
        color: '#1976D2',
        detectBy: {
            keywords: ['storm']
        },
        threshold: 3
    },
    'Madness/Self-Discard': {
        description: 'Strategies that benefit from discarding cards',
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
            tags: ['sneak', 'sneak-creature', 'sneak-self']
        },
        threshold: 3
    },
    'Morph': {
        description: 'Cards that interact with face-down creatures or morph',
        color: '#616161',
        detectBy: {
            tags: ['face-up-face-down-effects', 'face-down-face-up-effects', 'turn-face-down'],
            keywords: ['morph', 'manifest', 'manifest dread']
        },
        threshold: 4
    }
};

/**
 * Analyzes a cube's cards to detect supported archetypes
 * @param {Array} cards - Array of cube card objects with enriched data
 * @returns {Array} Array of detected archetype objects with support counts
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

    // Analyze each card for archetype support
    cards.forEach(card => {
        Object.keys(ARCHETYPE_DEFINITIONS).forEach(archetypeName => {
            const archetype = ARCHETYPE_DEFINITIONS[archetypeName];
            let supportsArchetype = false;

            // Check tags
            if (archetype.detectBy.tags) {
                supportsArchetype = supportsArchetype ||
                    archetype.detectBy.tags.some(tag =>
                        card.tags?.some(cardTag => cardTag.toLowerCase() === tag.toLowerCase())
                    );
            }

            // Check keywords
            if (archetype.detectBy.keywords) {
                supportsArchetype = supportsArchetype ||
                    archetype.detectBy.keywords.some(keyword =>
                        card.keywords?.some(cardKeyword => cardKeyword.toLowerCase() === keyword.toLowerCase())
                    );
            }

            if (supportsArchetype) {
                archetypeSupport[archetypeName].count++;
                archetypeSupport[archetypeName].cards.push(card.name);
            }
        });
    });

    // Filter archetypes that meet threshold and add support level
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
