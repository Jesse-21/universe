/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: chainSchema } = require("../chain");

/**
 * Data schema for SALES indexer rule
 * Currently only support channel
 */
const schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "IndexerRule",
  },
  fromBlock: { type: String },
  toBlock: { type: String },
  fromAddress: { type: String },
  toAddress: { type: String },
  contractAddresses: [{ type: String }],
  chain: chainSchema,
  category: [{ type: String }],
});

module.exports = { schema };
