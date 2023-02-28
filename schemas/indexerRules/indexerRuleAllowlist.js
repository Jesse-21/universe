/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");
const { schema: chainSchema } = require("../chain");

/**
 * Data schema for ALLOWLIST indexer rule
 * Currently only support role
 */
const schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "IndexerRule",
  },
  addresses: [{ type: String, required: true }],
  chain: chainSchema,
});

module.exports = { schema };
