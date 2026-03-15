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
            tags: ['artifact', 'artifactfall', 'artifactify', 'artifact-removal'],
            types: ['Artifact'],
            keywords: ['affinity', 'improvise', 'fabricate'],
            oracleText: [/artifact/i, /metalcraft/i, /modular/i]
        },
        threshold: 8
    },
    'Graveyard Value': {
        description: 'Strategies that utilize the graveyard as a resource',
        color: '#4A4A4A',
        detectBy: {
            tags: ['graveyard', 'graveyard-fuel', 'reanimation', 'mill'],
            keywords: ['flashback', 'dredge', 'delve', 'escape', 'disturb', 'unearth'],
            oracleText: [/graveyard/i, /mill/i, /from your graveyard/i, /cards in your graveyard/i]
        },
        threshold: 6
    },
    'Tokens Matter': {
        description: 'Creating and benefiting from token creatures',
        color: '#F4D03F',
        detectBy: {
            tags: ['token', 'tokenize', 'populate'],
            keywords: ['populate', 'convoke'],
            oracleText: [/token/i, /create.*creature token/i],
            properties: ['makesTokens']
        },
        threshold: 8
    },
    'Spells Matter': {
        description: 'Cards that reward casting instants and sorceries',
        color: '#3498DB',
        detectBy: {
            tags: ['spells-matter', 'storm', 'prowess'],
            keywords: ['prowess', 'storm'],
            oracleText: [/instant or sorcery/i, /noncreature spell/i, /whenever you cast/i]
        },
        threshold: 6
    },
    'Sacrifice': {
        description: 'Strategies built around sacrificing permanents',
        color: '#8E44AD',
        detectBy: {
            tags: ['sacrifice', 'sacrifice-outlet', 'sacrifice-cost', 'death-trigger'],
            oracleText: [/sacrifice/i, /when.*dies/i, /whenever.*is put into.*graveyard from the battlefield/i]
        },
        threshold: 6
    },
    'Lifegain': {
        description: 'Cards that gain life or benefit from lifegain',
        color: '#F8F9FA',
        detectBy: {
            tags: ['lifegain', 'lifegain-matters', 'lifegain-increaser'],
            keywords: ['lifelink'],
            oracleText: [/gain.*life/i, /whenever you gain life/i, /lifegain/i]
        },
        threshold: 5
    },
    'Counters Matter': {
        description: 'Strategies involving +1/+1 counters or other counters',
        color: '#27AE60',
        detectBy: {
            tags: ['counter', 'counter-fuel', 'counter-doubler', 'proliferate'],
            keywords: ['modular', 'graft', 'undying', 'persist', 'evolve', 'adapt'],
            oracleText: [/\+1\/\+1 counter/i, /counter.*on/i, /proliferate/i]
        },
        threshold: 6
    },
    // 'Ramp': {
    //     description: 'Accelerating mana development',
    //     color: '#229954',
    //     detectBy: {
    //         tags: ['ramp', 'lands-matter', 'landfall'],
    //         oracleText: [/search your library for.*land/i, /add.*mana/i, /lands you control/i],
    //         types: ['Artifact — Treasure', 'Land']
    //     },
    //     threshold: 8
    // },
    'Removal Suite': {
        description: 'Comprehensive removal package',
        color: '#E74C3C',
        detectBy: {
            tags: ['removal', 'creature-removal', 'artifact-removal', 'enchantment-removal'],
            oracleText: [/destroy target/i, /exile target/i, /damage to target/i]
        },
        threshold: 12
    },
    'Card Draw': {
        description: 'Card advantage and selection',
        color: '#3F51B5',
        detectBy: {
            tags: ['draw', 'card-selection', 'scry'],
            oracleText: [/draw.*card/i, /scry/i, /look at.*cards/i]
        },
        threshold: 10
    },
    'Tribal Synergies': {
        description: 'Creature type synergies',
        color: '#FF7043',
        detectBy: {
            tags: ['tribal', 'creature-type-matters'],
            types: ['Kindred'],
            oracleText: [/choose a creature type/i, /creatures you control/i, /creature types/i]
        },
        threshold: 4
    },
    'Burn/Aggro': {
        description: 'Fast aggressive strategies',
        color: '#D32F2F',
        detectBy: {
            tags: ['aggressive', 'burn', 'burn-any', 'burn-player', 'haste'],
            keywords: ['haste', 'first strike', 'double strike'],
            oracleText: [/damage to any target/i, /damage to target player/i]
        },
        threshold: 8
    },
    'Enchantments Matter': {
        description: 'Strategies focusing on enchantments and constellation',
        color: '#9C27B0',
        detectBy: {
            tags: ['enchantment', 'enchantmentfall', 'constellation', 'enchantment-engine', 'enchantmentize'],
            keywords: ['constellation'],
            oracleText: [/enchantment/i, /constellation/i]
        },
        threshold: 5
    },
    'Mill/Self-Mill': {
        description: 'Milling cards from libraries as a strategy',
        color: '#607D8B',
        detectBy: {
            tags: ['mill', 'graveyard-fuel-self', 'mill-self', 'mill-target'],
            oracleText: [/mill/i, /put.*cards from.*library into.*graveyard/i]
        },
        threshold: 4
    },
    'Lands Matter': {
        description: 'Strategies that care about lands and landfall',
        color: '#8D6E63',
        detectBy: {
            tags: ['lands-matter', 'landfall', 'land-animate', 'land-count-matters', 'land-etb'],
            keywords: ['landfall'],
            oracleText: [/landfall/i, /whenever a land enters/i, /lands you control/i, /basic land types/i]
        },
        threshold: 6
    },
    'Energy': {
        description: 'Strategies utilizing energy counters',
        color: '#FBC02D',
        detectBy: {
            tags: ['energy', 'energy-matters'],
            keywords: ['fabricate'],
            oracleText: [/energy counter/i, /get.*energy/i, /pay.*energy/i]
        },
        threshold: 4
    },
    'Equipment': {
        description: 'Strategies focused on equipment and voltron',
        color: '#757575',
        detectBy: {
            tags: ['equipment', 'equip', 'voltron'],
            types: ['Artifact — Equipment'],
            keywords: ['equip'],
            oracleText: [/equipment/i, /equip/i, /equipped creature/i]
        },
        threshold: 5
    },
    'Flicker': {
        description: 'Strategies that flicker creatures for value',
        color: '#00BCD4',
        detectBy: {
            tags: ['flicker', 'blink', 'etb', 'enters-the-battlefield'],
            oracleText: [/exile.*return/i, /flicker/i, /enters the battlefield/i, /when.*enters/i]
        },
        threshold: 6
    },
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
                        card.tags?.some(cardTag => cardTag.toLowerCase().includes(tag.toLowerCase()))
                    );
            }

            // Check keywords
            if (archetype.detectBy.keywords) {
                supportsArchetype = supportsArchetype ||
                    archetype.detectBy.keywords.some(keyword =>
                        card.keywords?.some(cardKeyword => cardKeyword.toLowerCase().includes(keyword.toLowerCase()))
                    );
            }

            // Check type line
            if (archetype.detectBy.types) {
                supportsArchetype = supportsArchetype ||
                    archetype.detectBy.types.some(type =>
                        card.typeLine?.includes(type)
                    );
            }

            // Check oracle text patterns
            if (archetype.detectBy.oracleText) {
                supportsArchetype = supportsArchetype ||
                    archetype.detectBy.oracleText.some(pattern =>
                        pattern.test(card.oracleText || '')
                    );
            }

            // Check special properties
            if (archetype.detectBy.properties) {
                supportsArchetype = supportsArchetype ||
                    archetype.detectBy.properties.some(prop =>
                        card[prop] === true
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
