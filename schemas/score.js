/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema({
  score: { type: String },
  address: { type: String, index: true },
  scoreType: { type: String, index: true },
});

schema.index({ address: 1, scoreType: 1 });
schema.index({ scoreType: 1, score: 1 });

module.exports = { schema };
