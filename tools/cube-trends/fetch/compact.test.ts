import { describe, it, expect } from 'vitest';
import { remapCube } from '../../../src/util/CubeFunctions';
import { compactRevision, InvalidRevisionError } from './compact';

function rawFixture(): any {
    return {
        id: 'cube1',
        shortId: 'short1',
        name: 'Test Cube',
        owner: { id: 'owner1', username: 'alice' },
        date: 1745595563148,
        dateLastUpdated: 1745595563148,
        likeCount: 3,
        image: { uri: 'https://example.com/img.png', artist: 'someone' },
        brief: 'A test cube',
        categoryOverride: 'Legacy',
        categoryPrefixes: ['Powered'],
        changelog: { id: 'rev1', date: 1745595563148 },
        views: 12345,
        description: 'a long description',
        collaborators: ['bob'],
        cards: {
            mainboard: [
                {
                    cardID: 'card-1',
                    addedTmsp: '1745595563148',
                    status: 'Owned',
                    tags: ['staple'],
                    details: {
                        elo: 1500,
                        popularity: 0.5,
                        cubeCount: 100,
                        oracle_id: 'oracle-1',
                        scryfall_id: 'scryfall-1',
                        name: 'Lightning Bolt',
                        prices: { usd: '0.50' },
                        set: 'lea',
                    },
                },
                {
                    cardID: 'card-2',
                    addedTmsp: '1745595563148',
                    status: 'Owned',
                    tags: [],
                    details: {
                        elo: 1600,
                        popularity: 0.7,
                        cubeCount: 200,
                        oracle_id: 'oracle-2',
                        scryfall_id: 'scryfall-2',
                        name: 'Counterspell',
                        prices: { usd: '1.50' },
                        set: 'lea',
                    },
                },
                {
                    cardID: 'custom-card',
                    addedTmsp: '1745595563148',
                    status: 'Owned',
                    tags: [],
                    custom_name: 'My Custom Card',
                    cmc: 2,
                    colors: ['U'],
                    type_line: 'Creature — Wizard',
                    imgUrl: 'https://example.com/custom.png',
                    details: {
                        elo: 1400,
                        popularity: 0.1,
                        cubeCount: 1,
                    },
                },
            ],
        },
    };
}

describe('compactRevision', () => {
    it('drops fields not in the spec list', () => {
        const compact = compactRevision(rawFixture());
        expect(compact).not.toHaveProperty('views');
        expect(compact).not.toHaveProperty('description');
        expect(compact).not.toHaveProperty('collaborators');
        for (const card of compact.cards.mainboard) {
            expect(card.details).not.toHaveProperty('prices');
        }
    });

    it('produces a result that remapCube can consume unchanged', () => {
        const raw = rawFixture();
        const compact = compactRevision(raw);
        const cube = remapCube(compact, false);

        expect(cube.cards.length).toBe(3);

        const custom = cube.cards.find((c) => c.isCustomCard);
        expect(custom?.isCustomCard).toBe(true);

        const normal = cube.cards.find((c) => c.oracleId === raw.cards.mainboard[0].details.oracle_id);
        expect(normal?.oracleId).toBe(raw.cards.mainboard[0].details.oracle_id);

        expect(cube.lastModified).toBe(raw.date);
    });

    it('throws InvalidRevisionError when changelog is missing', () => {
        const raw = rawFixture();
        delete raw.changelog;
        expect(() => compactRevision(raw)).toThrow(InvalidRevisionError);
    });

    it('throws InvalidRevisionError when id is missing', () => {
        const raw = rawFixture();
        delete raw.id;
        expect(() => compactRevision(raw)).toThrow(InvalidRevisionError);
    });

    it('throws InvalidRevisionError when cards.mainboard is missing', () => {
        const raw = rawFixture();
        delete raw.cards.mainboard;
        expect(() => compactRevision(raw)).toThrow(InvalidRevisionError);
    });

    it('coerces changelog.date to a number', () => {
        const raw = rawFixture();
        raw.changelog.date = '1745595563148';
        const compact = compactRevision(raw);
        expect(compact.changelog.date).toBe(1745595563148);
    });
});
