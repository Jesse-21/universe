/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Data schema for ERC721 or ERC1155 indexer rule type
 * Currently only support role
 */
const schema = mongoose.Schema({
  indexerRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "IndexerRule",
  },
  // the contract address of the ERC721
  address: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "Address",
  },
  // the ERC721 token or ERC1155 token id to index
  tokenId: { type: String },
  // the minimum amount to hold
  minAmount: { type: Number, default: 1 },
});

module.exports = { schema };
