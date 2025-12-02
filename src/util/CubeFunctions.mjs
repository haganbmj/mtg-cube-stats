import { useMemoize } from '@vueuse/core';
import { cosineSimilarity, intersectionSizeOf } from './SimiliartyFunctions.mjs';
import { isEvergreenKeyword } from './Keywords.mjs';

const scryfallLoad = () => import('../../data/cards-minimized.json');
var scryfall = null;

export async function initScryfall() {
    console.time('Loading Scryfall card data');
    scryfall = (await scryfallLoad());
    console.timeEnd('Loading Scryfall card data');
}

/**
 * Strip down the Cube model from CubeCobra to just the couple fields we care about.
 * The CubeCobra object has most of the card details we would care about, but they include user edits and might be for reprints.
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
 */
export function enrichCubeContents(cards) {
    return cards.map(card => {
        const scryfallCard = scryfall.cards[card.oracleId];
        if (!scryfallCard) {
            console.warn(`Could not find card with oracle ID ${card.oracleId} in Scryfall data.`);
        }

        // The default cases here really should only matter for Custom Cards, the rest we should have data for (unless it's _brand_ new).
        return {
            ...card,
            name: scryfallCard?.name ?? 'Unknown Card',
            cmc: scryfallCard?.cmc ?? 0,
            colorIdentity: scryfallCard?.colorIdentity ?? [],
            typeLine: scryfallCard?.typeLine ?? '',
            effectiveTypes: scryfallCard?.effectiveTypes ?? [],
            oracleText: scryfallCard?.oracleText ?? '',
            oracleTextWordCount: scryfallCard?.oracleTextWordCount ?? 0,
            oracleTextWordCountMinusParen: scryfallCard?.oracleTextWordCountMinusParen ?? 0,
            legality: scryfallCard?.legality ?? {},
            isUniversesBeyond: scryfallCard?.isUniversesBeyond ?? false,
            rarity: scryfallCard?.rarity ?? undefined,
            releaseDate: scryfallCard?.releaseDate ?? undefined,
            releaseYear: scryfallCard?.releaseDate ? parseInt(scryfallCard.releaseDate.split('-')[0]) : undefined,
            setCode: scryfallCard?.setCode?.toUpperCase() ?? '',
            collectorNumber: scryfallCard?.collectorNumber ?? '',
            isSupplementalProduct: scryfallCard?.isSupplementalProduct ?? false,
            keywords: scryfallCard?.keywords ?? [],
            tags: scryfallCard?.tags ?? [],
            isNormalLayout: scryfallCard?.isNormalLayout ?? false,
            makesTokens: scryfallCard?.makesTokens ?? false,
            minPriceUsd: scryfallCard?.minPriceUsd ?? null,
        };
    });
}

/**
 * FIXME: Ideally want this to do intermediate calculations if necessary.
 *  Unclear if that means I should break out the calculations to their own functions.
 *  Also, need to work out how Vue is handling reactivity with these as props on an object, might be better to use a Map or some other structure to avoid recomputes.
 */
export function analyzeCubeContents(cards) {
    // FIXME: Handle DFCs better here. MDFCs should be considered nonLand for the side that is, but DFCs that flip into lands (or vice-versa) should use their primary side?
    //  It's awkward too because the FIN Adventure lands are 0 CMC, despite being non-land spells if you want.
    // const nonLandCards = cards.filter(card => !card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land'));
    const nonLandCards = cards.filter(card => !card.effectiveTypes.includes('Land'));
    const newDateCutoff = `${new Date().getFullYear() - 1}-${new Date().getMonth()}-${new Date().getDate()}`;

    const firstOrderStats = {
        totalCards: cards.length,
        totalUniqueCards: new Set(cards.map(c => c.oracleId)).size,
        // FIXME: This is only handling the front of DFCs.
        // landCards: cards.filter(card => card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land')).length,
        landCards: cards.filter(card => card.effectiveTypes.includes('Land')).length,
        newCards: cards.filter(card => card.releaseDate >= newDateCutoff).length,

        averageElo: cards.reduce((sum, c) => sum + (c.elo ?? 1200), 0) / cards.length,
        averagePopularity: cards.reduce((sum, c) => sum + (c.popularity ?? 1200), 0) / cards.length,
        averageNonLandCmc: nonLandCards.reduce((sum, c) => sum + (c.cmc ?? 0), 0) / nonLandCards.length,

        // FIXME: Strict color category should be something I embed on the main card model.
        cmcByStrictColor: nonLandCards.reduce((sums, c) => {
            let colorKey = '';
            if (c.colorIdentity.length === 0) {
                colorKey = 'C';
            } else if (c.colorIdentity.length === 1) {
                colorKey = c.colorIdentity[0];
            } else {
                colorKey = 'M';
            }

            if (!sums[colorKey]) {
                sums[colorKey] = { totalCmc: 0, count: 0 };
            }

            sums[colorKey].totalCmc += (c.cmc ?? 0);
            sums[colorKey].count += 1;
            return sums;
        }, {}),
        colorDistribution: {
            W: nonLandCards.filter(c => c.colorIdentity.includes('W')).length,
            U: nonLandCards.filter(c => c.colorIdentity.includes('U')).length,
            B: nonLandCards.filter(c => c.colorIdentity.includes('B')).length,
            R: nonLandCards.filter(c => c.colorIdentity.includes('R')).length,
            G: nonLandCards.filter(c => c.colorIdentity.includes('G')).length,
            C: nonLandCards.filter(c => c.colorIdentity.length === 0).length,
        },
        cmcDistribution: (() => {
            // FIXME: Should this just try and account for Lands as their own entry?
            const distribution = {};
            distribution["L"] = cards.length - nonLandCards.length;
            for (let i = 0; i < 10; i++) {
                distribution[i] = nonLandCards.filter(c => Math.floor(c.cmc) === i).length;
            }
            distribution['10+'] = nonLandCards.filter(c => c.cmc >= 10).length;
            return distribution;
        })(),

        // FIXME: This is currently double counting if a card has multiple types.
        //  And it doesn't handle MDFCs as being functionally both types...
        //  Probably doesn't handle split cards either?
        typeLineDistribution: (() => {
            const types = {};
            // This would just be the front side of any DFCs.
            cards.forEach(card => {
                // Look only at the front face? This is probably naive and needs to handle MDFCs.
                for (const type of card.effectiveTypes) {
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
            cards.forEach(card => {
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
            cards.forEach(card => {
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
        rarityDistribution: cards.reduce((rarities, c) => {
            const rarity = c.rarity ?? 'unknown';
            rarities[rarity] = (rarities[rarity] ?? 0) + 1;
            return rarities;
        }, {}),
        averageWordCount: cards.reduce((sum, c) => sum + (c.oracleTextWordCount ?? 0), 0) / cards.length,
        averageWordCountMinusParen: cards.reduce((sum, c) => sum + (c.oracleTextWordCountMinusParen ?? 0), 0) / cards.length,
        // This is a map of keyword -> count
        keywords: cards.reduce((keywords, c) => {
            c.keywords?.forEach(kw => {
                keywords[kw] = (keywords[kw] ?? 0) + 1;
            });
            return keywords;
        }, {}),
        totalMinPriceUsd: cards.reduce((sum, c) => sum + (c.minPriceUsd ?? 0), 0),
    }

    const secondOrderStats = {
        ...firstOrderStats,
        uniqueKeywords: Object.keys(firstOrderStats.keywords).length,
        uniqueNonEvergreenKeywords: Object.keys(firstOrderStats.keywords).filter(kw => !isEvergreenKeyword(kw)).length,
        cardCounts: {
            // FIXME: Move the rest of the counts into this prop, then do percentages in a consistent way.
            removal: cards.filter(c => c.tags.includes('removal')).length,
            makesTokens: cards.filter(c => c.makesTokens).length,
            universesBeyond: cards.filter(c => c.isUniversesBeyond).length,
            supplementalProduct: cards.filter(c => c.isSupplementalProduct).length,
            abnormalLayout: cards.filter(c => !c.isNormalLayout).length,
            // Apparently this isn't a keyword in the comp rules, so that's awkward.
            // There are others too; Become the Monarch, Becomes Day/Night, etc.
            initiative: cards.filter(c => c.oracleText?.toLowerCase().includes('take the initiative')).length,
        },
    }

    const thirdOrderStats = {
        ...secondOrderStats,
        percentages: {
            newCards: (secondOrderStats.newCards / secondOrderStats.totalCards),
            landCards: (secondOrderStats.landCards / secondOrderStats.totalCards),
            makesTokens: (secondOrderStats.cardCounts.makesTokens / secondOrderStats.totalCards),
            universesBeyond: (secondOrderStats.cardCounts.universesBeyond / secondOrderStats.totalCards),
            supplementalProduct: (secondOrderStats.cardCounts.supplementalProduct / secondOrderStats.totalCards),
            abnormalLayout: (secondOrderStats.cardCounts.abnormalLayout / secondOrderStats.totalCards),
            initiative: (secondOrderStats.cardCounts.initiative / secondOrderStats.totalCards),
        },
    }

    return thirdOrderStats;
}

/**
 * FIXME: This doesn't evaluate filtered cards (eg. non-land).
 * FIXME: This also caches based on purely the cube id,
 *  so if the CubeCon static set is loaded then it will lock the evaluations
 *  using those versions of the list even if you add the current ones.
 */
export const determineCosineSimilarityScore = useMemoize(
    (cubeA, cubeB) => determineCosineSimilarityScoreInternal(cubeA, cubeB),
    {
        getKey: (cubeA, cubeB) => `${cubeA.id}|${cubeB.id}`,
    },
)

function determineCosineSimilarityScoreInternal(cubeA, cubeB) {
    const cardsA = cubeA.cards.map(c => c.oracleId);
    const cardsB = cubeB.cards.map(c => c.oracleId);

    return {
        cosineSimilarity: cosineSimilarity(cardsA, cardsB),
        insersectionSize: intersectionSizeOf(cardsA, cardsB),
    };
}
