const index = {}

function embed(doc, callback, tfidf=false) {
  let model = global.distribution.embeddings;
  let words = doc.toLowerCase().split(' ');
  let stopwords = global.distribution.stopwords;
  words = words.filter((word) => !stopwords.includes(word));
  if (tfidf) {
    global.distribution.documents += 1;
    let sum = null;
    let total = 0;
    vectors = {};
    for (word of words) {
      if (word in model) {
        if (word in vectors) {
          vectors[word] = {vec: model[word], count: vectors[word].count + 1}
        } else {
          vectors[word] = {vec: model[word], count: 1}
        }
        total += 1;
      }
    }
    for (const [word, info] of Object.entries(vectors)) {
      global.distribution.tfidf[word] += 1;
      tf = info.count / total;
      idf = Math.log(global.distribution.documents / global.distribution.tfidf[word]);
      weight = tf * idf
      if (sum === null) {
        sum = info.vec.map((x) => x * weight);
      } else {
        for (let i = 0; i < sum.length; i++) {
          sum[i] += info.vec[i] * weight;
          sum[i] = sum[i];
        }
      }
    }
    if (sum !== null) {
      sum = Array.from({length: 50}, () => 0.0)
    }
    if (callback) {
      callback(null, sum);
    }
    return sum;
  } else {
    let sum = null;
    for (word of words) {
      if (word in model) {
        if (sum === null) {
          sum = model[word];
        } else {
          for (let i = 0; i < sum.length; i++) {
            sum[i] += model[word][i];
          }
        }
      }
    }
    if (sum !== null) {
      const length = words.length;
      for (let i = 0; i < sum.length; i++) {
        sum[i] /= length;
        sum[i] = sum[i];
      }
    } else {
      sum = Array.from({length: 50}, () => 0.0)
    }
    if (callback) {
      callback(null, sum);
    }
    return sum;
  }
}

index.embed = embed;

module.exports = index;
