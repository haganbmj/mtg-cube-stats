import type { CompactRevision } from '../types';

export class InvalidRevisionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidRevisionError';
    }
}

function withoutUndefined<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    for (const key of Object.keys(obj)) {
        if (obj[key] !== undefined) {
            (result as any)[key] = obj[key];
        }
    }
    return result;
}

function compactCard(card: any): any {
    return withoutUndefined({
        cardID: card.cardID,
        status: card.status,
        addedTmsp: card.addedTmsp,
        custom_name: card.custom_name,
        cmc: card.cmc,
        colors: card.colors,
        type_line: card.type_line,
        imgUrl: card.imgUrl,
        details: card.details ? withoutUndefined({
            scryfall_id: card.details.scryfall_id,
            oracle_id: card.details.oracle_id,
            elo: card.details.elo,
            popularity: card.details.popularity,
            name: card.details.name,
        }) : undefined,
    });
}

/** Shrinks a raw CubeCobra `cubeJSON?date=` response to the fields later tasks need, in raw shape. */
export function compactRevision(raw: any): CompactRevision {
    if (!raw || typeof raw.id !== 'string') {
        throw new InvalidRevisionError('revision is missing id');
    }
    if (!raw.changelog || typeof raw.changelog.id !== 'string' || raw.changelog.date === undefined || raw.changelog.date === null) {
        throw new InvalidRevisionError('revision is missing changelog.id or changelog.date');
    }
    if (!Array.isArray(raw.cards?.mainboard)) {
        throw new InvalidRevisionError('revision is missing cards.mainboard');
    }

    return withoutUndefined({
        id: raw.id,
        shortId: raw.shortId,
        name: raw.name,
        owner: raw.owner ? withoutUndefined({ id: raw.owner.id, username: raw.owner.username }) : undefined,
        date: raw.date,
        dateLastUpdated: raw.dateLastUpdated,
        likeCount: raw.likeCount,
        image: raw.image ? withoutUndefined({ uri: raw.image.uri }) : undefined,
        brief: raw.brief,
        categoryOverride: raw.categoryOverride,
        categoryPrefixes: raw.categoryPrefixes,
        changelog: { id: raw.changelog.id, date: Number(raw.changelog.date) },
        cards: { mainboard: raw.cards.mainboard.map(compactCard) },
    }) as CompactRevision;
}
