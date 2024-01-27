/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A generic key value schema
 */
const schema = mongoose.Schema({
  zIndex: { type: Number },
  src: { type: String },
});

module.exports = { schema };
