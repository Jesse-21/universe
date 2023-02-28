/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Data schema for ALLOWLIST indexer rule
 * Currently only support role
 */
const schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "IndexerRule",
    required: true,
  },
  // the api endpoint to query
  uri: { type: String, required: true },
});

module.exports = { schema };
