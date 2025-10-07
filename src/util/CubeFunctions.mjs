import { en } from 'element-plus/es/locales.mjs';
import scryfall from '../../data/cards-minimized.json' with { type: 'json' };

/**
 * Strip down the Cube model from CubeCobra to just the couple fields we care about.
 * The CubeCobra object has most of the card details we would care about, but they include user edits and might be for reprints.
 *
 * @param {object} cube
 * @returns {object}
 */
export function remapCube(cube, enrich = true) {
    const cards = cube.cards.mainboard.map(card => {
        return {
            oracleId: card.details.oracle_id,
            elo: card.details.elo,
            popularity: card.details.popularity,
        };
    });

    return {
        id: cube.id,
        name: cube.name,
        owner: cube.owner.username,
        ownerId: cube.owner.id,
        thumbnail: cube.image.uri,
        category: cube.categoryOverride ?? '',
        categoryPrefixes: (cube.categoryPrefixes ?? []).sort(), // This is an array, so unclear how to get the best use out of it.

        cards: enrich ? enrichCubeContents(cards) : cards,

        // FIXME: Maybe I move the enrich out to its own function to keep file size down on the preload?
        // cards: cube.cards.mainboard.map(card => {
        //     return {
        //         oracleId: card.details.oracle_id,
        //         elo: card.details.elo,
        //         popularity: card.details.popularity,
        //     };
        // }),
        // cards: enrichCubeContents(
        //     cube.cards.mainboard.map(card => {
        //         return {
        //             oracleId: card.details.oracle_id,
        //             elo: card.details.elo,
        //             popularity: card.details.popularity,
        //         };
        //     })
        // ),
    };
}

/**
 * FIXME: This needs to handle Custom Cards on CubeCobra. I think those just have cardId="custom-card"
 * @param {object[]} cards
 * @returns {object[]}
 */
export function enrichCubeContents(cards) {
    console.log(`Enriching cube...`);
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
            keywords: scryfallCard?.keywords ?? [],
            isNormalLayout: scryfallCard?.isNormalLayout ?? false,
            makesTokens: scryfallCard?.makesTokens ?? false,
        };
    });
}

/**
 * @param {object[]} cards
 */
export function analyzeCubeContents(cards, excludeLands = false) {
    const nonLandCards = cards.filter(card => !card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land'));
    const filteredCards = excludeLands ? nonLandCards : cards;

    // const uniqueKeywords = filteredCards.reduce((keywords, c) => {
    //     c.keywords?.forEach(kw => {
    //         keywords[kw] = (keywords[kw] ?? 0) + 1;
    //     });
    //     return keywords;
    // }, {});

    const firstOrderStats = {
        totalCards: cards.length,
        totalUniqueCards: new Set(cards.map(c => c.oracleId)).size,
        landCards: cards.filter(card => card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land')).length,

        filteredCards: filteredCards.length,
        averageElo: filteredCards.reduce((sum, c) => sum + (c.elo ?? 1200), 0) / cards.length,
        averagePopularity: filteredCards.reduce((sum, c) => sum + (c.popularity ?? 1200), 0) / cards.length,
        colorDistribution: {
            W: filteredCards.filter(c => c.colorIdentity.includes('W')).length,
            U: filteredCards.filter(c => c.colorIdentity.includes('U')).length,
            B: filteredCards.filter(c => c.colorIdentity.includes('B')).length,
            R: filteredCards.filter(c => c.colorIdentity.includes('R')).length,
            G: filteredCards.filter(c => c.colorIdentity.includes('G')).length,
            C: filteredCards.filter(c => c.colorIdentity.length === 0).length,
        },
        cmcDistribution: (() => {
            // FIXME: Should this just try and account for Lands as their own entry?
            const distribution = {};
            for (let i = 0; i < 10; i++) {
                distribution[i] = nonLandCards.filter(c => Math.floor(c.cmc) === i).length;
            }
            distribution['10+'] = nonLandCards.filter(c => c.cmc >= 10).length;
            return distribution;
        })(),
        // This is currently double counting if a card has multiple types.
        // And it doesn't handle MDFCs as being functionally both types...
        // Probably doesn't handle split cards either?
        typeLineDistribution: (() => {
            const types = {};
            // This would just be the front side of any DFCs.
            filteredCards.forEach(card => {
                // Look only at the front face? This is probably naive and needs to handle MDFCs.
                const cardTypes = card.typeLine.split('//')[0].split('—')[0].trim().split(' ');
                for (const type of cardTypes) {
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
        keywords: filteredCards.reduce((keywords, c) => {
            c.keywords?.forEach(kw => {
                keywords[kw] = (keywords[kw] ?? 0) + 1;
            });
            return keywords;
        }, {}),
        cardCounts: {
            makesTokens: filteredCards.filter(c => c.makesTokens).length,
            universesBeyond: filteredCards.filter(c => c.isUniversesBeyond).length,
            supplementalProduct: filteredCards.filter(c => c.isSupplementalProduct).length,
            abnormalLayout: filteredCards.filter(c => !c.isNormalLayout).length,
        },
    }

    const secondOrderStats = {
        ...firstOrderStats,
        uniqueKeywords: Object.keys(firstOrderStats.keywords).length,
    }

    return secondOrderStats;

    // return {
    //     totalCards: cards.length,
    //     filteredCards: filteredCards.length,
    //     landCards: cards.filter(card => card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land')).length,
    //     totalUniqueCards: new Set(cards.map(c => c.oracleId)).size,
    //     colorDistribution: {
    //         W: cards.filter(c => c.colorIdentity.includes('W')).length,
    //         U: cards.filter(c => c.colorIdentity.includes('U')).length,
    //         B: cards.filter(c => c.colorIdentity.includes('B')).length,
    //         R: cards.filter(c => c.colorIdentity.includes('R')).length,
    //         G: cards.filter(c => c.colorIdentity.includes('G')).length,
    //         C: cards.filter(c => c.colorIdentity.length === 0).length,
    //     },
    //     averageElo: filteredCards.reduce((sum, c) => sum + (c.elo ?? 1200), 0) / cards.length,
    //     averagePopularity: filteredCards.reduce((sum, c) => sum + (c.popularity ?? 1200), 0) / cards.length,
    //     // Rounded down to the nearest integer.
    //     cmcDistribution: (() => {
    //         const distribution = {};
    //         for (let i = 0; i < 10; i++) {
    //             distribution[i] = nonLandCards.filter(c => Math.floor(c.cmc) === i).length;
    //         }
    //         distribution['10+'] = nonLandCards.filter(c => c.cmc >= 10).length;
    //         return distribution;
    //     })(),
    //     // This is currently double counting if a card has multiple types.
    //     // And it doesn't handle MDFCs as being functionally both types...
    //     // Probably doesn't handle split cards either?
    //     typeLineDistribution: (() => {
    //         const types = {};
    //         // This would just be the front side of any DFCs.
    //         cards.forEach(card => {
    //             // Look only at the front face? This is probably naive and needs to handle MDFCs.
    //             const cardTypes = card.typeLine.split('//')[0].split('—')[0].trim().split(' ');
    //             for (const type of cardTypes) {
    //                 // Maybe keep the basics to be able to identify those?
    //                 if (type === 'Legendary' || type === 'Basic' || type === 'Snow' || type === 'World') {
    //                     continue;
    //                 }
    //                 if (!types[type]) {
    //                     types[type] = 0;
    //                 }
    //                 types[type]++;
    //             }
    //         });
    //         return types;
    //     })(),
    //     keywords: uniqueKeywords,
    //     uniqueKeywords: Object.keys(uniqueKeywords).length,
    //     makesTokens: cards.filter(c => c.makesTokens).length,
    //     universesBeyond: cards.filter(c => c.isUniversesBeyond).length,
    //     supplementalProduct: cards.filter(c => c.isSupplementalProduct).length,
    //     abnormalLayout: cards.filter(c => !c.isNormalLayout).length,
    // };
}

export default { remapCube, analyzeCubeContents }
