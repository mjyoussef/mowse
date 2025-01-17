const fs = require("fs");
const path = require("path");

/**
 * Loads GloVe word embeddings (and stop words).
 *
 * @param {string} folderPath - folder containing embeddings.
 * @param {Function} callback - optional callback that accepts error, value
 */
function loadGloVeEmbeddings(folderPath, callback) {
  try {
    const embeddings = {};
    const tfidf = {};
    const files = fs.readdirSync(folderPath);
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const data = fs.readFileSync(filePath, "utf8");
      const lines = data.split("\n");
      lines.forEach((line) => {
        const parts = line.split(" ");
        const word = parts[0];
        const embedding = parts.slice(1).map(parseFloat);
        if (!embeddings[word]) {
          embeddings[word] = embedding;
          tfidf[word] = 0;
        }
      });
    });

    // saves embeddings
    global.distribution.embeddings = embeddings;

    // save the list of stop words
    const stopwordsLst = fs
      .readFileSync("./distribution/util/stop.txt", "utf8")
      .split("\n");
    global.distribution.stopwords = new Set();
    stopwordsLst.forEach((word) => {
      global.distribution.stopwords.add(word);
    });
    callback(undefined, true);
  } catch (error) {
    callback(new Error(error.message), undefined);
  }
}

/**
 * Computes an embedding for a list of list of words, where each group
 * has a weight assigned to it.
 *
 * @param {Array[]} inputs - list of list of words (each group has a weight at the end)
 * @param {boolean} [tfidf=false] - whether to weight words using tf-idf scores
 * @return {number[]} - a vector embedding
 */
function embed(inputs, tfidf = false) {
  // GloVe embeddings
  let model = global.distribution.embeddings;

  // we'll need this for filtering out stop words later
  let stopWords = global.distribution.stopwords;

  if (!global.tfidf) {
    // for computing IDF
    global.tfidf = {
      numDocuments: 0,
      numDocumentsContainingWord: {},
    };
  }

  // update the number of documents in this node
  global.tfidf.numDocuments += 1;

  // count the frequency w/ which each word occurs in the document
  const wordFrequencies = {};
  let documentSize = 0;
  inputs.forEach((group) => {
    // last element is the weighting for the group!
    for (let i = 0; i < group.length - 1; i++) {
      const word = group[i];
      // if the word is a stop word or doesn't have an embedding, skip it
      if (stopWords.has(word) || !model.hasOwnProperty(word)) {
        continue;
      }

      // update the frequency of this word in the document
      const freq = wordFrequencies[word] || 0;
      wordFrequencies[word] = freq + 1;

      // update the number of words in the document
      documentSize += 1;

      // update the number of documents containing the word (used for IDF scores)
      if (tfidf) {
        if (wordFrequencies[word] === 1) {
          if (!global.tfidf.numDocumentsContainingWord[word]) {
            global.tfidf.numDocumentsContainingWord[word] = 0;
          }
          global.tfidf.numDocumentsContainingWord[word] += 1;
        }
      }
    }
  });

  // Now, we need to generate the unnormalized weights for each word
  const unnormalizedWeights = {};
  let weightSum = 0;
  inputs.forEach((group) => {
    let groupWeight = group[group.length - 1];

    group.forEach((word) => {
      // make sure the word is a valid word
      if (wordFrequencies.hasOwnProperty(word)) {
        let tf = wordFrequencies[word] / documentSize;
        let idf = 1;

        if (tfidf) {
          idf = Math.log(
            global.tfidf.numDocuments /
              (1 + global.tfidf.numDocumentsContainingWord[word])
          );
        }

        unnormalizedWeights[word] = tf * idf * groupWeight;
        weightSum += unnormalizedWeights[word];
      }
    });
  });

  // now, we need to normalize the weights for each word and compute the embedding
  let sum = Array.from({ length: 50 }, () => 0.0);

  for (let word of Object.keys(unnormalizedWeights)) {
    const normalizedWeight = unnormalizedWeights[word] / weightSum;

    const embedding = model[word];
    for (let i = 0; i < embedding.length; i++) {
      sum[i] += (normalizedWeight * embedding[i]) / documentSize;
    }
  }

  return sum;
}

module.exports = {
  embed: embed,
  loadGloVeEmbeddings: loadGloVeEmbeddings,
};
