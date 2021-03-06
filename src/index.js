const fetch = require('node-fetch');

const URL = require("url").URL;

const removeAccents = require('remove-accents');

const { checkIfExistsInFirestore, saveToFirestore } = require('./lib/firestore');
const { publishMessageToPubSub } = require('./lib/pubsub');
const { extractPlaqueSlug, extractPlaqueData } = require('./lib/extractors/plaqueDetails');
const { extractPlaquePageUrls } = require('./lib/extractors/indexPageUrls');

exports.getPlaqueDataFromOhtPage = async (data, context) => {
    const urlToScrape = getUrlFromDataObject(data);

    const plaqueSlug = extractPlaqueSlug(urlToScrape.toString());

    // Add this plaque page to our list of plaque pages.
    await saveToFirestore(
        plaqueSlug,
        {
            id: plaqueSlug,
            url: urlToScrape.toString(),
        },
        'plaquePageList'
    );

    // Bail early if the record already exists in firestore.
    if (await checkIfExistsInFirestore(plaqueSlug, 'plaques')) {
        console.log('Already exists in Firestore:', plaqueSlug);

        return;
    }

    const ohtResult = await fetch(urlToScrape);

    const responseBody = await ohtResult.text();

    const resJson = {
        status: ohtResult.status,
        statusText: ohtResult.statusText,
        url: ohtResult.url,
        plaqueDetails: extractPlaqueData(responseBody),
    };

    await saveToFirestore(
        plaqueSlug,
        {
            id: plaqueSlug,
            url: ohtResult.url,
            ...resJson.plaqueDetails,
        },
        'plaques'
    );

    return resJson;
};

exports.getPlaquePageUrlsFromOhtIndexPage = async (data, context) => {
    const urlToScrape = getUrlFromDataObject(data);

    const ohtResult = await fetch(urlToScrape);

    const responseBody = await ohtResult.text();

    const resJson = {
        status: ohtResult.status,
        statusText: ohtResult.statusText,
        url: ohtResult.url,
        plaquePageUrls: extractPlaquePageUrls(responseBody),
    };

    // publish a message to topic `plaquePagesToScrape` for each URL, with URL as message body
    resJson.plaquePageUrls.forEach(async (url) => await publishMessageToPubSub('plaquePagesToScrape', url));

    return resJson;
};

const getUrlFromDataObject = (dataObject) => new URL(removeAccents(JSON.parse(Buffer.from(dataObject.data, 'base64').toString())));
