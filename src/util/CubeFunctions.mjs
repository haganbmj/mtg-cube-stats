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
            printingId: card.details.scryfall_id,
            oracleId: card.details.oracle_id,
            elo: card.details.elo,
            popularity: card.details.popularity,
        };
    });

    return {
        id: cube.id,
        shortId: cube.shortId,
        name: cube.name,
        owner: cube.owner.username,
        ownerId: cube.owner.id,
        thumbnail: cube.image.uri,
        category: cube.categoryOverride ?? '',
        categoryPrefixes: (cube.categoryPrefixes ?? []).sort(), // This is an array, so unclear how to get the best use out of it.

        cards: enrich ? enrichCubeContents(cards) : cards,
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
            oracleText: scryfallCard?.oracleText ?? '',
            oracleTextWordCount: scryfallCard?.oracleTextWordCount ?? 0,
            oracleTextWordCountMinusParen: scryfallCard?.oracleTextWordCountMinusParen ?? 0,
            legality: scryfallCard?.legality ?? {},
            isUniversesBeyond: scryfallCard?.isUniversesBeyond ?? false,
            rarity: scryfallCard?.rarity ?? undefined,
            releaseDate: scryfallCard?.releaseDate ?? undefined,
            releaseYear: scryfallCard?.releaseDate ? parseInt(scryfallCard.releaseDate.split('-')[0]) : undefined,
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

    const firstOrderStats = {
        totalCards: cards.length,
        totalUniqueCards: new Set(cards.map(c => c.oracleId)).size,
        landCards: cards.filter(card => card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land')).length,

        filteredCards: filteredCards.length,
        averageElo: filteredCards.reduce((sum, c) => sum + (c.elo ?? 1200), 0) / cards.length,
        averagePopularity: filteredCards.reduce((sum, c) => sum + (c.popularity ?? 1200), 0) / cards.length,
        averageNonLandCmc: nonLandCards.reduce((sum, c) => sum + (c.cmc ?? 0), 0) / nonLandCards.length,
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
            distribution["L"] = excludeLands ? 0 : cards.length - nonLandCards.length;
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
        minimumFormatLegalityDistribution: (() => {
            const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'cube'];
            const legality = {};
            filteredCards.forEach(card => {
                for (const format of formats) {
                    if (card.legality[format] === true) {
                        legality[format] = (legality[format] ?? 0) + 1;
                        return;
                    }
                }
                legality['cube'] = (legality['cube'] ?? 0) + 1;
            });
            return legality;
        })(),
        releaseYearDistribution: (() => {
            const distribution = {};
            filteredCards.forEach(card => {
                if (!card.releaseYear) {
                    return;
                }
                if (!distribution[card.releaseYear]) {
                    distribution[card.releaseYear] = 0;
                }
                distribution[card.releaseYear]++;
            });
            return distribution;
        })(),
        rarityDistribution: filteredCards.reduce((rarities, c) => {
            const rarity = c.rarity ?? 'unknown';
            rarities[rarity] = (rarities[rarity] ?? 0) + 1;
            return rarities;
        }, {}),
        averageWordCount: filteredCards.reduce((sum, c) => sum + (c.oracleTextWordCount ?? 0), 0) / filteredCards.length,
        averageWordCountMinusParen: filteredCards.reduce((sum, c) => sum + (c.oracleTextWordCountMinusParen ?? 0), 0) / filteredCards.length,
        // This is a map of keyword -> count
        keywords: filteredCards.reduce((keywords, c) => {
            c.keywords?.forEach(kw => {
                keywords[kw] = (keywords[kw] ?? 0) + 1;
            });
            return keywords;
        }, {}),
    }

    const secondOrderStats = {
        ...firstOrderStats,
        uniqueKeywords: Object.keys(firstOrderStats.keywords).length,
        cardCounts: {
            makesTokens: filteredCards.filter(c => c.makesTokens).length,
            universesBeyond: filteredCards.filter(c => c.isUniversesBeyond).length,
            supplementalProduct: filteredCards.filter(c => c.isSupplementalProduct).length,
            abnormalLayout: filteredCards.filter(c => !c.isNormalLayout).length,
            // Apparently this isn't a keyword in the comp rules, so that's awkward.
            // There are others too; Become the Monarch, Becomes Day/Night, etc.
            initiative: filteredCards.filter(c => c.oracleText?.toLowerCase().includes('take the initiative')).length,
        },
    }

    const thirdOrderStats = {
        ...secondOrderStats,
        percentages: {
            landCards: (secondOrderStats.landCards / secondOrderStats.totalCards),
            makesTokens: (secondOrderStats.cardCounts.makesTokens / secondOrderStats.filteredCards),
            universesBeyond: (secondOrderStats.cardCounts.universesBeyond / secondOrderStats.filteredCards),
            supplementalProduct: (secondOrderStats.cardCounts.supplementalProduct / secondOrderStats.filteredCards),
            abnormalLayout: (secondOrderStats.cardCounts.abnormalLayout / secondOrderStats.filteredCards),
            initiative: (secondOrderStats.cardCounts.initiative / secondOrderStats.filteredCards),
        },
    }

    return thirdOrderStats;
}

export default { remapCube, analyzeCubeContents }
