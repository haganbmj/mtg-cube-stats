import scryfall from '../../data/cards-minimized.json' with { type: 'json' };

/**
 * Strip down the Cube model from CubeCobra to just the couple fields we care about.
 * The CubeCobra object has most of the card details we would care about, but they include user edits and might be for reprints.
 *
 * @param {object} cube
 * @returns {object}
 */
export function remapCube(cube) {
    return {
        id: cube.id,
        name: cube.name,
        owner: cube.owner.username,
        ownerId: cube.owner.id,
        thumbnail: cube.image.uri,

        // FIXME: Maybe I move the enrich out to its own function to keep file size down on the preload?
        cards: enrichCubeContents(
            cube.cards.mainboard.map(card => {
                return {
                    oracleId: card.details.oracle_id,
                    elo: card.details.elo,
                    popularity: card.details.popularity,
                };
            })
        ),
    };
}

/**
 * FIXME: This needs to handle Custom Cards on CubeCobra.
 * @param {object[]} cards
 * @returns {object[]}
 */
function enrichCubeContents(cards) {
    return cards.map(card => {
        const scryfallCard = scryfall.cards[card.oracleId];
        if (!scryfallCard) {
            console.warn(`Could not find card with oracle ID ${card.oracleId} in Scryfall data.`);
        }
        return {
            ...card,
            name: scryfallCard?.name ?? 'Unknown Card',
            cmc: scryfallCard?.cmc ?? 0,
            colorIdentity: scryfallCard?.colorIdentity ?? [],
            typeLine: scryfallCard?.typeLine ?? '',
            isUniversesBeyond: scryfallCard?.isUniversesBeyond ?? false,
            isSupplementalProduct: scryfallCard?.isSupplementalProduct ?? false,
            isNormalLayout: scryfallCard?.isNormalLayout ?? false,
            makesTokens: scryfallCard?.makesTokens ?? false,
        };
    });
}

/**
 * @param {object[]} cards
 */
export function analyzeCubeContents(cards) {
    return {
        totalCards: cards.length,
        totalUniqueCards: new Set(cards.map(c => c.oracleId)).size,
        colorDistribution: {
            W: cards.filter(c => c.colorIdentity.includes('W')).length,
            U: cards.filter(c => c.colorIdentity.includes('U')).length,
            B: cards.filter(c => c.colorIdentity.includes('B')).length,
            R: cards.filter(c => c.colorIdentity.includes('R')).length,
            G: cards.filter(c => c.colorIdentity.includes('G')).length,
            C: cards.filter(c => c.colorIdentity.length === 0).length,
        },
        cmcDistribution: (() => {
            const distribution = {};
            for (let i = 0; i < 10; i++) {
                distribution[i] = cards.filter(c => Math.floor(c.cmc) === i).length;
            }
            distribution['10+'] = cards.filter(c => c.cmc >= 10).length;
            return distribution;
        })(),
        // This is currently double counting if a card has multiple types.
        // And it doesn't handle MDFCs as being functionally both types...
        // Probably doesn't handle split cards either?
        typeLineDistribution: (() => {
            const types = {};
            // This would just be the front side of any DFCs.
            cards.forEach(card => {
                // Look only at the front face? This is probably naive and needs to handle MDFCs.
                const superTypes = card.typeLine.split('//')[0].split('—')[0].trim().split(' ');
                // console.log(card.typeLine, '=>', superTypes);
                for (const type of superTypes) {
                    // Maybe keep the basics to be able to identify those?
                    if (type === 'Legendary' || type === 'Basic' || type === 'Snow' || type === 'World') {
                        continue;
                    }
                    if (!types[type]) {
                        types[type] = 0;
                    }
                    types[type]++;
                }
            });
            return types;
        })(),
        makesTokens: cards.filter(c => c.makesTokens).length,
        universesBeyond: cards.filter(c => c.isUniversesBeyond).length,
        supplementalProduct: cards.filter(c => c.isSupplementalProduct).length,
        abnormalLayout: cards.filter(c => !c.isNormalLayout).length,
    };
}

export default { remapCube, analyzeCubeContents }
