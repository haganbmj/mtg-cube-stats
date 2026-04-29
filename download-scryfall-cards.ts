import fs from 'fs';
import axios from 'axios';
import { strict as assert } from 'assert';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { chain } = _require('stream-chain');
const { parser } = _require('stream-json');
const { streamArray } = _require('stream-json/streamers/stream-array');
import { detectCardArchetypes } from './src/util/ArchetypeDetection';
import type { CubeCard } from './src/types';

const refresh = process.env.REFRESH_SCRYFALL || 'false';

if (!fs.existsSync('./data/default-cards.json') || process.argv[2] == "--update" || refresh.toLowerCase() === 'true') {
    console.log('Downloading fresh card data.');

    const dataResp = await axios({
        url: `https://api.scryfall.com/bulk-data/default-cards?format=file`,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Griselbrand/0.1.0',
        },
    });

    const write = fs.createWriteStream('./data/default-cards.json');
    dataResp.data.pipe(write);
    await new Promise((res, rej) => {
        write.on('finish', res);
        write.on('error', rej);
    });
} else {
    console.log('Using existing card data.');
}

if (!fs.existsSync('./data/flavor-words.json') || process.argv[2] == "--update" || refresh.toLowerCase() === 'true') {
    console.log('Downloading fresh flavor data.');

    const flavorWordsResp = await axios({
        url: `https://api.scryfall.com/catalog/flavor-words?format=file`,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Griselbrand/0.1.0',
        },
    })

    const writeFlavor = fs.createWriteStream('./data/flavor-words.json');
    flavorWordsResp.data.pipe(writeFlavor);
    await new Promise((res, rej) => {
        writeFlavor.on('finish', res);
        writeFlavor.on('error', rej);
    });
} else {
    console.log('Using existing flavor data.');
}

if (!fs.existsSync('./data/sets.json') || process.argv[2] == "--update" || refresh.toLowerCase() === 'true') {
    console.log('Downloading fresh set data.');

    const setsResp = await axios({
        url: 'https://api.scryfall.com/sets',
        method: 'GET',
        headers: {
            'User-Agent': 'Griselbrand/0.1.0',
        },
    });

    fs.writeFileSync('./data/sets.json', JSON.stringify(setsResp.data, null, 2));
} else {
    console.log('Using existing set data.');
}

if (!fs.existsSync('./data/tagger-data.json') || process.argv[2] == "--update" || refresh.toLowerCase() === 'true') {
    console.log('Downloading fresh tagger data.');

    const taggerResp = await axios({
        url: `https://api.scryfall.com/private/tags/oracle`,
        method: 'GET',
        responseType: 'stream',
    })

    const writeTagger = fs.createWriteStream('./data/tagger-data.json');
    taggerResp.data.pipe(writeTagger);
    await new Promise((res, rej) => {
        writeTagger.on('finish', res);
        writeTagger.on('error', rej);
    });
} else {
    console.log('Using existing tagger data.');
}

// default-cards.json exceeds V8's ~512MB string limit so it must be parsed as a stream.
const cards: any[] = await new Promise((resolve, reject) => {
    const result: any[] = [];
    const pipeline = chain([
        fs.createReadStream('./data/default-cards.json'),
        parser(),
        streamArray(),
    ]);
    pipeline.on('data', ({ value }: { value: any }) => result.push(value));
    pipeline.on('end', () => resolve(result));
    pipeline.on('error', reject);
});
const flavorWords = JSON.parse(fs.readFileSync('./data/flavor-words.json', 'utf8'));
const taggerData = JSON.parse(fs.readFileSync('./data/tagger-data.json', 'utf8'));
const setsData = JSON.parse(fs.readFileSync('./data/sets.json', 'utf8'));

// Build a compact setCode -> ISO release date map for use in date filters
const setDates: Record<string, string> = {};
setsData.data.forEach((set: any) => {
    if (set.released_at) setDates[set.code.toLowerCase()] = set.released_at;
});

const customPromoSetTypes = [
    'from_the_vault',
    'spellbook',
    'memorabilia', // Includes World Champs decks and CE/IE.
    'box', // Includes all Secret Lairs.
    'duel_deck',
    'premium_deck',
    'masterpiece',
];

const customPromoSets = [
    'plist', // The List.
    'mb1', // Specifically non-Playtest card Mystery Booster inclusions.
    'sum', // Summer Magic.
];

const customNotPromoSets = [
    'phpr',
];

const notPromoTypes = [
    'universesbeyond',
];

const includedSets = [
    'sunf', // Unfinity Sticker Sheets.
];

const excludedSets = [
    'fbb',
    '4bb',
    'rin',
    'ren',
];

const excludedSetTypes = [
    'token',
];

const excludedLayouts = [
    'art_series',
];

const taggerOracleIds: Record<string, Set<string>> = {};

// Include ALL tags from tagger data to enhance archetype detection
taggerData.data.forEach((tag: any) => {
    tag.oracle_ids.forEach((oracle: string) => {
        if (taggerOracleIds[oracle] === undefined) {
            taggerOracleIds[oracle] = new Set();
        }
        taggerOracleIds[oracle].add(tag.label);
    });
});

// Slap on another tag entry for every card that relates to a token.
cards.forEach((card: any) => {
    if (card.all_parts?.some((part: any) => part.component === 'token')) {
        if (taggerOracleIds[card.oracle_id] === undefined) {
            taggerOracleIds[card.oracle_id] = new Set();
        }
        taggerOracleIds[card.oracle_id].add('token');
    }
});

const flatMapTypes = (typeLine: string): string[] => {
    // Some of the Spiderman cards are using the wrong dash character.
    return typeLine.replace('—', '-').split('//')[0].split('-')[0].trim().split(' ');
}

const effectiveTypes = (card: any): string[] => {
    if (card.layout === 'adventure') {
        // Consider only the primary type of Adventures.
        // Could probably do this better, but it gets around the FIN Adventure Lands...
        return flatMapTypes(card.card_faces[0].type_line);
    } else if (card.layout === 'modal_dfc' || card.layout === 'split') {
        return card.card_faces.flatMap((face: any) => flatMapTypes(face.type_line));
    } else {
        return flatMapTypes(card.type_line);
    }
};

const PRIMARY_TYPE_RANKING = ['Land', 'Creature', 'Artifact', 'Enchantment', 'Instant', 'Sorcery'];
const SUPERTYPES = new Set(['Legendary', 'Basic', 'Snow', 'World', 'Elite']);

const primaryType = (card: any): string => {
    // Split cards: most significant type across all faces wins.
    // All other multi-face cards (DFC, adventure, flip, etc.): front face wins.
    // Single-face cards: use the card's own type line.
    const types = card.layout === 'split'
        ? card.card_faces.flatMap((face: any) => flatMapTypes(face.type_line))
        : card.card_faces
            ? flatMapTypes(card.card_faces[0].type_line)
            : flatMapTypes(card.type_line);
    for (const ranked of PRIMARY_TYPE_RANKING) {
        if (types.includes(ranked)) return ranked;
    }
    return types.find((t: string) => !SUPERTYPES.has(t)) ?? types[0];
};

const minRarityOrder = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'];

const stripped = cards.filter((card: any) => {
    // Process the exclusions.
    return includedSets.includes(card.set) ||
        ((!card.oversized || card.layout === 'planar')
        && !excludedSetTypes.includes(card.set_type)
        && !excludedLayouts.includes(card.layout)
        && !excludedSets.includes(card.set));
}).flatMap((card: any) => {
    // Do some handling for the stupid Reversible Card bullshit.
    // FIXME: Skipping these for the moment, they get screwy with the TDM Adventure Dragons and I don't need them.
    //  I think I'm missing 1 card by doing this so need to figure that out.
    if (card.layout === 'reversible_card') {
        return [];
        // return [
        //     { ...card, ...card.card_faces[0], collector_number: card.collector_number, card_faces: undefined, overridden_collector_number: `${card.collector_number}a`, reversible_face: 'front' },
        //     { ...card, ...card.card_faces[1], collector_number: card.collector_number, card_faces: undefined, overridden_collector_number: `${card.collector_number}b`,reversible_face: 'back' },
        // ];
    }

    return [ card ];
}).map((card: any) => {
    // Then set the high level data necessary to organize the remaining cards.
    let cardBackUri: string | undefined = undefined;
    if (card.card_faces?.[1]?.image_uris) {
        cardBackUri = `https://api.scryfall.com/cards/${card.set}/${card.collector_number}?format=image&face=back`;
    } else if (card.layout == 'meld') {
        cardBackUri = `https://backs.scryfall.io/large/${card.card_back_id.charAt(0)}/${card.card_back_id.charAt(1)}/${card.card_back_id}.jpg`;
    }

    const applicablePromoTypes = (card.promo_types || []).filter((pt: string) => !notPromoTypes.includes(pt));

    return {
        id: card.id,
        oracleId: card.oracle_id,
        name: card.name,
        releaseDate: card.released_at,
        set: {
            name: card.set_name,
            code: card.set,
        },
        cmc: card.cmc,
        // For split cards use combined colors (both halves are cast); for all other multi-face cards
        // (modal_dfc, transform, adventure, flip, etc.) use front-face colors only.
        colors: (card.card_faces && card.layout !== 'split')
            ? (card.card_faces[0].colors ?? card.colors ?? [])
            : (card.colors ?? []),
        colorIdentity: card.color_identity || [],
        typeLine: card.type_line,
        effectiveTypes: effectiveTypes(card),
        primaryType: primaryType(card),
        oracleText: card.oracle_text || (card.card_faces?.[0]?.oracle_text !== undefined ? card.card_faces.map((face: any) => face.oracle_text).join('\n\n') : ''),
        keywords: card.keywords || [],
        games: card.games || [],
        allParts: card.all_parts || [],
        legalities: card.legalities || {},
        rarity: card.rarity,
        setType: card.set_type,
        fromBooster: card.booster,
        promoTypes: card.promo_types || [],
        layout: card.layout,
        collectorNumber: card.overridden_collector_number ?? card.collector_number,
        isDigital: card.digital,
        isPromo: !customNotPromoSets.includes(card.set) && (card.promo || applicablePromoTypes.length > 0 || customPromoSetTypes.includes(card.set_type) || customPromoSets.includes(card.set)),
        isToken: card.layout === 'token' || card.layout === 'double_faced_token',
        imageUris: {
            front: `https://cards.scryfall.io/large/front/${card.id.charAt(0)}/${card.id.charAt(1)}/${card.id}.jpg`,
            back: cardBackUri,
        },
        priceUsd: card.prices?.usd ? parseFloat(card.prices.usd) : undefined,
        priceTix: card.prices?.tix ? parseFloat(card.prices.tix) : undefined,
        power: card.power ?? card.card_faces?.[0]?.power,
        toughness: card.toughness ?? card.card_faces?.[0]?.toughness,
    };
});

// fs.writeFileSync('./out.json', JSON.stringify(stripped, null, 2));

// Build a lookup map from printing id → oracle_id.
// Built from the raw cards array (not stripped) so token cards from excluded set types are included.
const idToOracleId: Record<string, string> = {};
cards.forEach((card: any) => {
    idToOracleId[card.id] = card.oracle_id;
});

const minimized = stripped.sort((a: any, b: any) => {
    // From there organize everything by release date in reverse chronological order.
    // In the event of multiple printings from the same set (basics) sort by set number.
    // Collector Numbers aren't actually numeric, becuase we can have A/B/C variants.
    // So we have to strip the non-numeric characters, compare those, then fallback to the alpha comparisons.
    // Without this we get into situations where 218a < 60 can happen with alt arts and such.
    // But this doesn't handle The List, which uses a reference back to the original printing (eg. PLST MM2-42), so the split+pop is to account for that.
    if (Date.parse(a.releaseDate) === Date.parse(b.releaseDate)) {
        const aInt = parseInt(a.collectorNumber.split('-').pop().replace(/[^0-9]/, ''));
        const bInt = parseInt(b.collectorNumber.split('-').pop().replace(/[^0-9]/, ''));

        if (aInt == bInt) {
            return a.collectorNumber <= b.collectorNumber ? -1 : 1;
        } else {
            return aInt <= bInt ? -1 : 1;
        }
    }

    return Date.parse(a.releaseDate) < Date.parse(b.releaseDate) ? -1 : 1;
}).reduce((store: any, card: any) => {
    try {
        // And take that and tighten it down as much as possible.
        // FIXME: Trim this model even more. Should strip everything I'm not using to reduce the bundle size.
        const key = card.oracleId;
        const tokenOracleIds = [...new Set(
            card.allParts
                .filter((part: any) => part.component === 'token')
                .map((part: any) => idToOracleId[part.id])
                .filter(Boolean),
        )] as string[];
        store.cards[key] = store.cards[key] || [];
        store.cards[key].push({
            setCode: card.set.code,
            collectorNumber: card.collectorNumber,
            releaseDate: card.releaseDate,

            name: card.name,
            cmc: card.cmc,
            colors: card.colors,
            // This is one we want, it is based on the mana cost.
            colorIdentity: card.colorIdentity,
            typeLine: card.typeLine,
            effectiveTypes: card.effectiveTypes,
            primaryType: card.primaryType,
            oracleText: card.oracleText,
            oracleTextWordCount: card.oracleText.split(/\b\W+\b/g).filter((v: string) => v != '').length,
            oracleTextWordCountMinusParen: card.oracleText.replace(/\(.*?\)/g, '').split(/\b\W+\b/g).filter((v: string) => v != '').length,
            // This needs sanitization to use, it seems to including flavor abilities.
            keywords: card.keywords.filter((kw: string) => !flavorWords.data.includes(kw)),
            games: card.games,
            // FIXME: Exnted this with any future tags I think I care about.
            tags: taggerOracleIds[card.oracleId] !== undefined ? Array.from(taggerOracleIds[card.oracleId]) : [],
            archetypes: [], // Will be filled after tags are set
            rarity: card.rarity,
            setType: card.setType,
            fromBooster: card.fromBooster,
            promoTypes: card.promoTypes,
            layout: card.layout,
            power: card.power,
            toughness: card.toughness,

            isDigital: card.isDigital ? true : undefined,
            isPromo: card.isPromo ? true : undefined,
            isToken: card.isToken ? true : undefined,
            isUniversesBeyond: card.promoTypes.includes('universesbeyond') ? true : undefined,
            isSupplementalProduct: ['core', 'expansion'].includes(card.setType) ? undefined : true,
            // Apparently planeswalkers are "normal" layout?
            isNormalLayout: card.layout === 'normal' ? true : undefined,
            makesTokens: card.allParts.some((part: any) => part.component === 'token') ? true : undefined,
            tokenOracleIds: tokenOracleIds.length > 0 ? tokenOracleIds : undefined,

            legality: {
                standard: card.legalities?.standard === 'legal' ? true : undefined,
                pioneer: card.legalities?.pioneer === 'legal' ? true : undefined,
                modern: card.legalities?.modern === 'legal' ? true : undefined,
                legacy: card.legalities?.legacy === 'legal' ? true : undefined,
                vintage: (card.legalities?.vintage === 'legal' || card.legalities?.vintage === 'restricted') ? true : undefined,
            },

            urlFront: card.imageUris.front,
            urlBack: card.imageUris.back,
            priceUsd: card.priceUsd,
            priceTix: card.priceTix,
        });

        store.sets[card.set.code] = card.set.name;

        return store;
    } catch (e) {
        console.log(`Failure during card: ${JSON.stringify(card)}`, e);
        throw e;
    }
}, { cards: {}, sets: {} });

// Remap that to just the "original" printing of each card.
const best = Object.keys(minimized.cards).reduce((store: any, key: string) => {
    const card = minimized.cards[key];
    store[key] = card.filter((printing: any) => {
        return !printing.isDigital && !printing.isPromo && !printing.isToken;
    })?.[0] ?? card[0];

    // FIXME: Should this store off which printing is the cheapest?
    const minPriceUsd = Math.min(...card.map((c: any) => c.priceUsd ?? Number.MAX_SAFE_INTEGER));
    if (minPriceUsd != Number.MAX_SAFE_INTEGER) {
        store[key].minPriceUsd = minPriceUsd;
    }

    const minPriceTix = Math.min(...card.map((c: any) => c.priceTix ?? Number.MAX_SAFE_INTEGER));
    if (minPriceTix != Number.MAX_SAFE_INTEGER) {
        store[key].minPriceTix = minPriceTix;
    }

    const allRarities = Array.from(new Set(card.map((c: any) => c.rarity)));
    store[key].rarities = allRarities;

    const minRarity = allRarities.sort((a: string, b: string) => {
        return minRarityOrder.indexOf(a) - minRarityOrder.indexOf(b);
    })[0];
    store[key].minRarity = minRarity;

    const allGames = Array.from(new Set(card.flatMap((c: any) => c.games)));
    store[key].games = allGames;

    // Detect archetypes for this card now that we have all the data
    store[key].archetypes = detectCardArchetypes(store[key] as CubeCard);

    return store;
}, {});

minimized.cards = best;

minimized.setDates = setDates;

// Build a map of the earliest printing of each token by oracle_id.
// Uses the raw cards array so tokens from dedicated token sets (excluded from stripped) are included.
const tokensByOracleId: Record<string, any[]> = {};
cards.forEach((card: any) => {
    if (card.layout === 'token' || card.layout === 'double_faced_token' || card.set_type === 'token') {
        const key = card.oracle_id;
        if (!tokensByOracleId[key]) tokensByOracleId[key] = [];
        tokensByOracleId[key].push(card);
    }
});

const bestTokens = Object.keys(tokensByOracleId).reduce((store: any, key: string) => {
    const earliest = tokensByOracleId[key].sort((a: any, b: any) =>
        Date.parse(a.released_at) - Date.parse(b.released_at),
    )[0];
    store[key] = {
        name: earliest.name,
        typeLine: earliest.type_line,
        oracleText: earliest.oracle_text || (earliest.card_faces?.[0]?.oracle_text !== undefined
            ? earliest.card_faces.map((face: any) => face.oracle_text).join('\n\n')
            : ''),
        colors: earliest.colors || [],
        power: earliest.power,
        toughness: earliest.toughness,
        urlFront: `https://cards.scryfall.io/large/front/${earliest.id.charAt(0)}/${earliest.id.charAt(1)}/${earliest.id}.jpg`,
    };
    return store;
}, {});

minimized.tokens = bestTokens;

console.log(`Found ${Object.keys(minimized.cards).length} distinct cards and ${Object.keys(minimized.tokens).length} distinct tokens from ${Object.keys(minimized.sets).length} sets.`);

assert.equal(
    minimized.sets['plc'],
    'Planar Chaos',
);

// fs.writeFileSync('./min-pretty.json', JSON.stringify(minimized, null, 2));
fs.writeFileSync('./data/cards-minimized.json', JSON.stringify(minimized, null, 2));

console.log('Finished writing minimized card list.');
