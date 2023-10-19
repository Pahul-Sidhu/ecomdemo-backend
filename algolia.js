require('dotenv').config();
const algoliasearch = require('algoliasearch');
const client = algoliasearch('IKFS9H2O50', process.env.ALGOLIA_KEY);
const index = client.initIndex('books');

// Perform the same search, but only retrieve 50 results
// Return only the attributes "firstname" and "lastname"


module.exports = function searchAlgolia(query) {
  return index.search(query, {
    hitsPerPage: 2, // Change the number of results you want to retrieve
  }).then(({ hits }) => {
    return hits;
  }).catch((err) => {
    console.error('Algolia search error:', err);
    return [];
  });
}