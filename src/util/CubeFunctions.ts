import { useMemoize } from '@vueuse/core';
import { cosineSimilarity, intersectionSizeOf, suffixedDuplicates } from './SimiliartyFunctions';
import { isEvergreenKeyword } from './Keywords';
import { detectCubeArchetypes, detectCardArchetypes } from './MLArchetypeDetection';
import type {
    ScryfallDataStructure,
    ScryfallCard,
    ScryfallToken,
    Cube,
    CubeCard,
    CubeStats,
    SimilarityScore,
    SimilarityMatrix
} from '../types';

const scryfallLoad = () => import('../../data/cards-minimized.json') as Promise<{ default: ScryfallDataStructure }>;

let scryfall: ScryfallDataStructure | null = null;

/**
 * Initialize Scryfall card data from the minimized JSON file
 */
export async function initScryfall(): Promise<void> {
    console.time('Loading Scryfall card data');
    const module = await scryfallLoad();
    scryfall = module.default;
    console.timeEnd('Loading Scryfall card data');
}

export function getTokens(): Record<string, ScryfallToken> {
    return scryfall?.tokens ?? {};
}

const rarityScoreMap: Record<string, number> = {
    common: 0.333,
    uncommon: 0.666,
    rare: 1.000,
    mythic: 1.200,
    bonus: 1.000,
};

const powerOracleIds = [
    '550c74d4-1fcb-406a-b02a-639a760a4380', // Ancestral Recall
    '5089ec1a-f881-4d55-af14-5d996171203b', // Black Lotus
    '376ee366-e082-402f-b4db-6592fcfcacd2', // Mox Emerald
    '0677f49e-f8bf-4349-af52-2ccde9287c2e', // Mox Jet
    '824597b8-c89a-47ec-8526-7efc6e24ef0e', // Mox Pearl
    'ed85fa82-e4fa-434b-92a8-36b6075708d1', // Mox Ruby
    'd5ed1233-df87-4b90-8918-13922ec95249', // Mox Sapphire
    'c823e687-6311-4c99-974b-fd77d204141a', // Timetwister
    'd0209d3f-3f7e-4fd5-bce5-10bce6f29c86', // Time Walk
];

/**
 * Get the full set name for a given set code
 */
export function getSetName(setCode: string): string {
    return scryfall?.sets[setCode.toLowerCase()] ?? setCode;
}

/**
 * Get the set release dates map (setCode -> ISO date string)
 */
export function getSetReleaseDates(): Record<string, string> {
    return scryfall?.setDates ?? {};
}

/**
 * Strip down the Cube model from CubeCobra to just the couple fields we care about.
 * The CubeCobra object has most of the card details we would care about, but they include user edits and might be for reprints.
 *
 * FIXME: This should probably be done as part of the function that fetches from Scryfall to remap that response object rather than relying on the caller to do it.
 */
export function remapCube(cube: any, enrich: boolean = true, fetchedAt?: string): Cube {
    const cards: CubeCard[] = cube.cards.mainboard.map((card: any) => ({
        printingId: card.details.scryfall_id,
        oracleId: card.details.oracle_id,
        elo: card.details.elo,
        popularity: card.details.popularity,
    }));

    const remappedCube: Cube = {
        id: cube.id,
        shortId: cube.shortId,
        name: cube.name,
        owner: cube.owner.username,
        ownerId: cube.owner.id,
        thumbnail: cube.image?.uri,
        // These categories/prefixes are pretty unreliable.
        // Might have to devise some way to categorize cubes myself.
        category: cube.categoryOverride ?? '',
        categoryPrefixes: (cube.categoryPrefixes ?? []).sort(), // This is an array, so unclear how to get the best use out of it.
        lastModified: cube.date ?? undefined,
        followerCount: cube.following?.length ?? 0,
        brief: cube.brief ?? '',
        fetchedAt: fetchedAt,

        cards: cards,
        suffixedCardIds: suffixedDuplicates(cards.map(c => c.oracleId)),
    };

    if (enrich) {
        return enrichCube(remappedCube);
    } else {
        return remappedCube;
    }
}

/**
 * Enrich a remapped cube with Scryfall data and compute statistics
 */
export function enrichCube(cube: Cube): Cube {
    const enrichedCards = enrichCubeContents(cube.cards);
    return {
        ...cube,
        stats: analyzeCubeContents(enrichedCards),
        cards: enrichedCards,
    };
}

/**
 * FIXME: This needs to handle Custom Cards on CubeCobra. I think those just have cardId="custom-card"
 */
function enrichCubeContents(cards: CubeCard[]): CubeCard[] {
    return cards.map(card => {
        const scryfallCard: ScryfallCard | undefined = scryfall?.cards[card.oracleId];
        if (!scryfallCard) {
            console.warn(`Could not find card with oracle ID ${card.oracleId} in Scryfall data.`);
        }

        // The default cases here really should only matter for Custom Cards, the rest we should have data for (unless it's _brand_ new).
        return {
            ...card,
            name: scryfallCard?.name ?? 'Unknown Card',
            cmc: scryfallCard?.cmc ?? 0,
            colors: scryfallCard?.colors ?? [],
            colorIdentity: scryfallCard?.colorIdentity ?? [],
            typeLine: scryfallCard?.typeLine ?? '',
            effectiveTypes: scryfallCard?.effectiveTypes ?? [],
            oracleText: scryfallCard?.oracleText ?? '',
            oracleTextWordCount: scryfallCard?.oracleTextWordCount ?? 0,
            oracleTextWordCountMinusParen: scryfallCard?.oracleTextWordCountMinusParen ?? 0,
            legality: scryfallCard?.legality ?? {},
            isUniversesBeyond: scryfallCard?.isUniversesBeyond ?? false,
            rarity: scryfallCard?.rarity ?? undefined,
            minRarity: scryfallCard?.minRarity ?? undefined,
            releaseDate: scryfallCard?.releaseDate ?? undefined,
            releaseYear: scryfallCard?.releaseDate ? parseInt(scryfallCard.releaseDate.split('-')[0]) : undefined,
            setCode: scryfallCard?.setCode?.toUpperCase() ?? '',
            setName: scryfall?.sets[scryfallCard?.setCode || ''] ?? '',
            collectorNumber: scryfallCard?.collectorNumber ?? '',
            isSupplementalProduct: scryfallCard?.isSupplementalProduct ?? false,
            keywords: scryfallCard?.keywords ?? [],
            games: scryfallCard?.games ?? [], // custom cards won't have a game listed.
            tags: scryfallCard?.tags ?? [],
            archetypes: detectCardArchetypes(card),
            setType: scryfallCard?.setType ?? '',
            layout: scryfallCard?.layout ?? '',
            isNormalLayout: scryfallCard?.isNormalLayout ?? false,
            makesTokens: scryfallCard?.makesTokens ?? false,
            tokenOracleIds: scryfallCard?.tokenOracleIds ?? [],
            power: scryfallCard?.power ?? undefined,
            toughness: scryfallCard?.toughness ?? undefined,
            minPriceUsd: scryfallCard?.minPriceUsd ?? null,
            minPriceTix: scryfallCard?.minPriceTix ?? null,
            urlFront: scryfallCard?.urlFront ?? '',
            urlBack: scryfallCard?.urlBack ?? '',
        };
    });
}

/**
 * FIXME: Ideally want this to do intermediate calculations if necessary.
 *  Unclear if that means I should break out the calculations to their own functions.
 *  Also, need to work out how Vue is handling reactivity with these as props on an object, might be better to use a Map or some other structure to avoid recomputes.
 */
function analyzeCubeContents(cards: CubeCard[]): CubeStats {
    // FIXME: Handle DFCs better here. MDFCs should be considered nonLand for the side that is, but DFCs that flip into lands (or vice-versa) should use their primary side?
    //  It's awkward too because the FIN Adventure lands are 0 CMC, despite being non-land spells if you want.
    // const nonLandCards = cards.filter(card => !card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land'));
    const nonLandCards = cards.filter(card => !card.effectiveTypes?.includes('Land'));
    const uniqueCards = Array.from(
        cards.reduce((map, card) => {
            // Only keep the first occurrence of each oracleId
            if (!map.has(card.oracleId)) {
                map.set(card.oracleId, card);
            }
            return map;
        }, new Map<string, CubeCard>()).values(),
    );
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    const newDateCutoff = cutoffDate.toISOString().split('T')[0];

    const firstOrderStats = {
        totalCards: cards.length,
        totalUniqueCards: new Set(cards.map(c => c.oracleId)).size,
        // FIXME: This is only handling the front of DFCs.
        // landCards: cards.filter(card => card.typeLine.split('//')[0].split('—')[0].trim().split(' ').includes('Land')).length,
        landCards: cards.filter(card => card.effectiveTypes?.includes('Land')).length,
        creatureCards: cards.filter(card => card.effectiveTypes?.includes('Creature')).length,
        newCards: cards.filter(card => card.releaseDate && card.releaseDate >= newDateCutoff).length,

        averageElo: cards.reduce((sum, c) => sum + (c.elo ?? 1200), 0) / cards.length,
        averagePopularity: cards.reduce((sum, c) => sum + (c.popularity ?? 1200), 0) / cards.length,
        blendedRarityScore: cards.reduce((sum, c) => sum + rarityScoreMap[c.minRarity ?? 'bonus'], 0.0) / cards.length,
        averageNonLandCmc: nonLandCards.reduce((sum, c) => sum + (c.cmc ?? 0), 0) / nonLandCards.length,

        // FIXME: Strict color category should be something I embed on the main card model.
        cmcByStrictColorIdentity: nonLandCards.reduce((sums: Record<string, {totalCmc: number, count: number}>, c) => {
            let colorKey = '';
            if (!c.colorIdentity || c.colorIdentity.length === 0) {
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
        colorIdentityDistribution: {
            W: nonLandCards.filter(c => c.colorIdentity?.includes('W')).length,
            U: nonLandCards.filter(c => c.colorIdentity?.includes('U')).length,
            B: nonLandCards.filter(c => c.colorIdentity?.includes('B')).length,
            R: nonLandCards.filter(c => c.colorIdentity?.includes('R')).length,
            G: nonLandCards.filter(c => c.colorIdentity?.includes('G')).length,
            C: nonLandCards.filter(c => !c.colorIdentity || c.colorIdentity.length === 0).length,
        },
        colorDistribution: {
            W: nonLandCards.filter(c => c.colors?.includes('W')).length,
            U: nonLandCards.filter(c => c.colors?.includes('U')).length,
            B: nonLandCards.filter(c => c.colors?.includes('B')).length,
            R: nonLandCards.filter(c => c.colors?.includes('R')).length,
            G: nonLandCards.filter(c => c.colors?.includes('G')).length,
            C: nonLandCards.filter(c => !c.colors || c.colors.length === 0).length,
        },
        cmcDistribution: (() => {
            // FIXME: Should this just try and account for Lands as their own entry?
            const distribution: Record<string | number, number> = {};
            distribution["L"] = cards.length - nonLandCards.length;
            for (let i = 0; i < 10; i++) {
                distribution[i] = nonLandCards.filter(c => Math.floor(c.cmc ?? 0) === i).length;
            }
            distribution['10+'] = nonLandCards.filter(c => (c.cmc ?? 0) >= 10).length;
            return distribution;
        })(),

        // FIXME: This is currently double counting if a card has multiple types.
        //  And it doesn't handle MDFCs as being functionally both types...
        //  Probably doesn't handle split cards either?
        typeLineDistribution: (() => {
            const types: Record<string, number> = {};
            // This would just be the front side of any DFCs.
            cards.forEach(card => {
                // Look only at the front face? This is probably naive and needs to handle MDFCs.
                if (card.effectiveTypes) {
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
                }
            });
            return types;
        })(),
        minimumFormatLegalityDistribution: (() => {
            const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'cube'];
            const legality: Record<string, number> = {};
            cards.forEach(card => {
                for (const format of formats) {
                    if (card.legality?.[format] === true) {
                        legality[format] = (legality[format] ?? 0) + 1;
                        return;
                    }
                }
                legality['cube'] = (legality['cube'] ?? 0) + 1;
            });
            return legality;
        })(),
        releaseYearDistribution: (() => {
            const distribution: Record<number, number> = {};
            cards.forEach(card => {
                if (!card.releaseYear || card.effectiveTypes?.includes('Basic')) {
                    return;
                }
                if (!distribution[card.releaseYear]) {
                    distribution[card.releaseYear] = 0;
                }
                distribution[card.releaseYear]++;
            });
            return distribution;
        })(),
        setCodeDistribution: cards.reduce((sets: Record<string, number>, c) => {
            const setCode = c.setCode ?? 'unknown';
            sets[setCode] = (sets[setCode] ?? 0) + 1;
            return sets;
        }, {}),
        rarityDistribution: cards.reduce((rarities: Record<string, number>, c) => {
            const rarity = c.rarity ?? 'unknown';
            rarities[rarity] = (rarities[rarity] ?? 0) + 1;
            return rarities;
        }, {}),
        minRarityDistribution: cards.reduce((rarities: Record<string, number>, c) => {
            const rarity = c.minRarity ?? 'unknown';
            rarities[rarity] = (rarities[rarity] ?? 0) + 1;
            return rarities;
        }, {}),
        averageWordCount: cards.reduce((sum, c) => sum + (c.oracleTextWordCountMinusParen ?? 0), 0) / cards.length,
        averageWordCountUnique: (() => {
            return uniqueCards.length > 0
                ? uniqueCards.reduce((sum, c) => sum + (c.oracleTextWordCountMinusParen ?? 0), 0) / uniqueCards.length
                : 0;
        })(),
        averageReleaseYear: (() => {
            const validCards = cards.filter(c => c.releaseYear && !c.effectiveTypes?.includes('Basic'));
            return validCards.length > 0 ? validCards.reduce((sum, c) => sum + (c.releaseYear ?? 2026), 0) / validCards.length : 2000;
        })(),
        averageReleaseYearStdDev: (() => {
            const validCards = cards.filter(c => c.releaseYear && !c.effectiveTypes?.includes('Basic'));
            if (validCards.length === 0) return 0;
            const mean = validCards.reduce((sum, c) => sum + (c.releaseYear ?? 2026), 0) / validCards.length;
            const variance = validCards.reduce((sum, c) => sum + Math.pow((c.releaseYear ?? 2026) - mean, 2), 0) / validCards.length;
            return Math.sqrt(variance);
        })(),
        medianReleaseYear: (() => {
            const years = cards
                .filter(c => c.releaseYear && !c.effectiveTypes?.includes('Basic'))
                .map(c => c.releaseYear!)
                .sort((a, b) => a - b);
            if (years.length === 0) return 2000;
            const mid = Math.floor(years.length / 2);
            return years.length % 2 !== 0 ? years[mid] : (years[mid - 1] + years[mid]) / 2;
        })(),
        medianReleaseYearMAD: (() => {
            const years = cards
                .filter(c => c.releaseYear && !c.effectiveTypes?.includes('Basic'))
                .map(c => c.releaseYear!)
                .sort((a, b) => a - b);
            if (years.length === 0) return 0;
            const mid = Math.floor(years.length / 2);
            const median = years.length % 2 !== 0 ? years[mid] : (years[mid - 1] + years[mid]) / 2;
            const deviations = years.map(y => Math.abs(y - median)).sort((a, b) => a - b);
            const devMid = Math.floor(deviations.length / 2);
            return deviations.length % 2 !== 0 ? deviations[devMid] : (deviations[devMid - 1] + deviations[devMid]) / 2;
        })(),
        // This is a map of keyword -> count
        keywords: cards.reduce((keywords: Record<string, number>, c) => {
            c.keywords?.forEach(kw => {
                keywords[kw] = (keywords[kw] ?? 0) + 1;
            });
            return keywords;
        }, {}),
        totalMinPriceUsd: cards.reduce((sum, c) => sum + (c.minPriceUsd ?? 0), 0),
        totalMinPriceTix: cards.reduce((sum, c) => sum + (c.minPriceTix ?? 0), 0),
        arenaPlayable: cards.every(c => c.games?.includes('arena')),
        mtgoPlayable: cards.every(c => c.games?.includes('mtgo')),
        paperPlayable: cards.every(c => c.games?.includes('paper')),
        graveyardOrderMatters: cards.some(c => c.tags?.includes('graveyard-order-matters')),
        assumedCategories: assumedCategories(cards),
    }

    const secondOrderStats: CubeStats = {
        ...firstOrderStats,
        uniqueKeywords: Object.keys(firstOrderStats.keywords).length,
        uniqueNonEvergreenKeywords: Object.keys(firstOrderStats.keywords).filter(kw => !isEvergreenKeyword(kw)).length,
        uniqueTokenCount: new Set(cards.flatMap(c => c.tokenOracleIds ?? [])).size,
        cardCounts: {
            // FIXME: Move the rest of the counts into this prop, then do percentages in a consistent way.
            removal: cards.filter(c => c.tags?.includes('removal')).length,
            makesTokens: cards.filter(c => c.makesTokens).length,
            universesBeyond: cards.filter(c => c.isUniversesBeyond).length,
            supplementalProduct: cards.filter(c => c.isSupplementalProduct).length,
            abnormalLayout: cards.filter(c => !c.isNormalLayout).length,
            // Apparently this isn't a keyword in the comp rules, so that's awkward.
            // There are others too; Become the Monarch, Becomes Day/Night, etc.
            initiative: cards.filter(c => c.oracleText?.toLowerCase().includes('take the initiative')).length,
        },
        archetypes: detectCubeArchetypes(cards),
    }

    return secondOrderStats;
}

function assumedCategories(cards: CubeCard[]): string[] {
    const totalCards = cards.length;
    const categories = new Set<string>(); // Not really necessary here since we should be only appending unique entries.

    const mappedRarities = cards.reduce((catCounts: Record<string, Record<string, number>>, c) => {
        const isLand = c.effectiveTypes?.includes('Land') ? 'land' : 'nonLand';
        const minRarity = c.minRarity ?? 'common';

        catCounts['all'] = catCounts['all'] || {};
        catCounts['all'][minRarity] = (catCounts['all'][minRarity] || 0) + 1;
        catCounts['all']['total'] = (catCounts['all']['total'] || 0) + 1;

        catCounts[isLand] = catCounts[isLand] || {};
        catCounts[isLand][minRarity] = (catCounts[isLand][minRarity] || 0) + 1;
        catCounts[isLand]['total'] = (catCounts[isLand]['total'] || 0) + 1;

        return catCounts;
    }, {
        all: {
            common: 0,
            uncommon: 0,
            rare: 0,
            mythic: 0,
            total: 0,
        },
        nonLand: {
            common: 0,
            uncommon: 0,
            rare: 0,
            mythic: 0,
            total: 0,
        },
        land: {
            common: 0,
            uncommon: 0,
            rare: 0,
            mythic: 0,
            total: 0,
        },
    });

    if (mappedRarities.all.common === totalCards) {
        categories.add('pauper');
    } else if (mappedRarities.nonLand.common + mappedRarities.land.total === totalCards) {
        categories.add('pauper+');
    } else if (mappedRarities.nonLand.common >= (mappedRarities.nonLand.total) * 0.925 && mappedRarities.land.common === mappedRarities.land.total) {
        categories.add('pauper-ish');
    } else if (mappedRarities.nonLand.common >= (mappedRarities.nonLand.total) * 0.925) {
        categories.add('pauper+ish');
    } else if (mappedRarities.all.common + mappedRarities.all.uncommon === totalCards) {
        categories.add('peasant');
    } else if (mappedRarities.nonLand.common + mappedRarities.nonLand.uncommon + mappedRarities.land.total === totalCards) {
        categories.add('peasant+');
    } else if (mappedRarities.nonLand.common + mappedRarities.nonLand.uncommon >= (mappedRarities.nonLand.total) * 0.925 && mappedRarities.land.common + mappedRarities.land.uncommon === mappedRarities.land.total) {
        categories.add('peasant-ish');
    } else if ((mappedRarities.nonLand.common + mappedRarities.nonLand.uncommon) >= (mappedRarities.nonLand.total * 0.925)) {
        categories.add('peasant+ish');
    }

    if (cards.some(c => powerOracleIds.includes(c.oracleId))) {
        categories.add('powered');
    } else {
        // TODO: I don't think it's worth flagging this as it's kind of implied by the absence of another tag?
        // categories.add('unpowered');
    }

    // Flag something as a desert if it has more than 28% lands?
    // Just opening up a few it looks like 31% is pretty typical, but we'll swing a bit lower.
    // We can't really make assumptions about how big the draft pool is, so we can't really use asfans.
    if (mappedRarities.land.total >= totalCards * 0.28) {
        // Is it worth throwing these secondary categories in their own prop?
        categories.add('desert?');
    }

    return Array.from(categories);
}

function similarityScoreKey(keyA: string, keyB: string): string {
    if (keyA < keyB) {
        return `${keyA}|${keyB}`;
    } else {
        return `${keyB}|${keyA}`;
    }
}

/**
 * FIXME: This doesn't evaluate filtered cards (eg. non-land).
 * FIXME: This also caches based on purely the cube id,
 *  so if the CubeCon static set is loaded then it will lock the evaluations
 *  using those versions of the list even if you add the current ones.
 */
export const determineCosineSimilarityScore = useMemoize(
    (cubeA: Cube, cubeB: Cube) => determineCosineSimilarityScoreInternal(cubeA, cubeB),
    {
        getKey: (cubeA: Cube, cubeB: Cube) => similarityScoreKey(cubeA.id, cubeB.id),
    },
);

/**
 * Internal implementation of cosine similarity calculation
 */
function determineCosineSimilarityScoreInternal(cubeA: Cube, cubeB: Cube): SimilarityScore {
    // Use pre-suffixed lists to prevent re-running that function an excessive number of times.
    const cardsA = cubeA.suffixedCardIds || [];
    const cardsB = cubeB.suffixedCardIds || [];

    return {
        cosineSimilarity: cosineSimilarity(cardsA, cardsB),
        insersectionSize: intersectionSizeOf(cardsA, cardsB),
    };
}

/**
 * Compute a full similarity matrix for a collection of cubes
 */
export const computeSimilarityMatrix = (cubes: Record<string, Cube>): SimilarityMatrix => {
    const result: SimilarityMatrix = {};
    let calcs = 0;

    console.time('Similarity Matrix');

    Object.entries(cubes).forEach(([id, cube]) => {
        Object.entries(cubes).forEach(([otherId, otherCube]) => {
            if (id !== otherId && result[id]?.[otherId] === undefined) {
                calcs += 1;
                const score = determineCosineSimilarityScore(cube, otherCube);

                if (!(id in result)) {
                    result[id] = {};
                }

                if (!(otherId in result)) {
                    result[otherId] = {};
                }

                result[id][otherId] = score;
                result[otherId][id] = score;
            }
        });
    });

    console.timeEnd('Similarity Matrix');
    console.log(`Calculated ${calcs} similarity score(s).`);

    return result;
};

export const preloadSimiliarityMatrix = (matrix: SimilarityMatrix): void => {
    Object.entries(matrix).forEach(([id, scores]) => {
        Object.entries(scores).forEach(([otherId, score]) => {
            determineCosineSimilarityScore.cache.set(similarityScoreKey(id, otherId), score);
        });
    });
};
