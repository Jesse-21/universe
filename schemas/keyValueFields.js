/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A generic key value schema
 */
const schema = mongoose.Schema({
  key: { type: String, required: true, index: true },
  value: { type: String },
});

module.exports = { schema };
