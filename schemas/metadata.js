/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A generic key value schema
 */
const schema = mongoose.Schema({
  domain: { type: String, required: true, index: true },
  uri: { type: String, required: true },
});

schema.index({ uri: 1 });

module.exports = { schema };
