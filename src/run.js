const fetch = require('node-fetch');
const cheerio = require('cheerio');

const { publishMessageToPubSub } = require('./lib/pubsub');
const { countRecordsInFirestoreCollection } = require('./lib/firestore');

(async () => {
    let urls = [
        'https://www.heritagetrust.on.ca/en/online-plaque-guide?handle=plaques-form&fields%5Bkeyword%5D=&fields%5Btheme%5D='
    ];

    const firstIndexPage = await fetch(urls[0]);

    const responseBody = await firstIndexPage.text();

    const $ = cheerio.load(responseBody);

    const numberOfPlaques = parseInt($('#content p:contains("plaques found that match your criteria")').first().text().toString().match(/\d/g).join(''));

    if (countRecordsInFirestoreCollection('plaques') == numberOfPlaques) {
        console.log('Number of plaques is equal to the number of records in the database. Aborting.')

        return;
    }
})();
