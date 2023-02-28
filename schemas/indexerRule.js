/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    // ALLOWLIST: list of whitelisted address (only role)
    // PUBLIC: any address in the community (only role)
    // SALES: index the transaction history (only channel)
    // NFT: index an ERC721 or ERC1155 (only role)
    // COLLECTION: index an NFT collection's floor and metadata (only rich content block)
    indexerRuleType: {
      type: String,
      enum: [
        "ALLOWLIST",
        "PUBLIC",
        "SALES",
        "NFT",
        "COLLECTION",
        "FARCASTER",
        "API",
      ],
    },
    // the data for the indexer rule depends on the indexerRuleType
    ruleDataId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    // the object type of the owner of indexer rule
    // const ruleOwnerType = {
    //     0: role,
    //     1: channel,
    //     3: richContentBlock,
    // }
    ruleOwnerType: { type: Number, index: true },
    ruleOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    // only used for SALES
    lastIndexedBlock: { type: String },
    lastIndexedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = { schema };
