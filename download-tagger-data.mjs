import fs from 'fs';
import axios from 'axios';

// TODO: Might be better to call this as part of a dedicated script to manage all these data loads.

// otag:removal includes land/artifact/enchantment just as a note.
// otag:removal-creature might be more meaningful for the average cube, but it's kind of confusing to use?

let oracleIds = [];
let nextPage = 'https://api.scryfall.com/cards/search?dir=asc&format=json&include_extras=false&include_multilingual=false&include_variations=false&order=set&page=1&q=otag%3Aremoval&unique=cards';

if (!fs.existsSync('./data/tagger-removal-oracle-ids.json') || process.argv[2] == "--update") {
    console.log('Downloading fresh tagger data.');

    while (true) {
        const resp = await axios.request({
            method: 'GET',
            url: nextPage,
        });

        const data = resp.data;

        const hasMore = data.has_more;
        oracleIds = oracleIds.concat(data.data.map(item => item['oracle_id']));

        console.log(`[${oracleIds.length}]: hasMore: ${hasMore}, nextPage: ${nextPage}`);

        if (!hasMore) {
            break;
        }

        nextPage = data.next_page;
    }

    fs.writeFileSync('./data/tagger-removal-oracle-ids.json', JSON.stringify(oracleIds, null, 2));
} else {
    console.log('Using existing tagger data.');

    oracleIds = JSON.parse(fs.readFileSync('./data/tagger-removal-oracle-ids.json'));
}
