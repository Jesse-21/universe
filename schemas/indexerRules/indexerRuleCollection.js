/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Data schema for COLLECTION indexer rule
 * Currently only support rich block (Collection)
 */
const schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "IndexerRule",
  },
  // the contract address of the ERC721
  contractAddress: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "Address",
  },
});

module.exports = { schema };
