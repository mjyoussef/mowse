#!/usr/bin/env node

function map(url, text) {
  return new Promise((resolve, reject) => {
    model = global.distribution.embeddings;
    words = text.toLowerCase().split(' ');
    sum = null;
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
      }
    }
    resolve({key: url, value: sum});
  });
}

function reduce(url, vectors) {
  return new Promise((resolve, reject) => {
    if (vectors.length === 0) {
      return null;
    }
    const sum = null;
    for (vector of vectors) {
      if (sum === null) {
        sum = vector;
      } else {
        for (let i = 0; i < sum.length; i++) {
          sum[i] += vector[i];
        }
      }
    }
    if (sum !== null) {
      const length = vectors.length;
      for (let i = 0; i < sum.length; i++) {
        sum[i] /= length;
      }
    }
    resolve({key: url, value: sum});
  });
}

module.exports = {
  map: map,
  reduce: reduce,
};