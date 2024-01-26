/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const attributeSchema = mongoose.Schema({
  displayType: String,
  value: String,
  traitType: String,
});
const imageSchema = mongoose.Schema({
  cachedUrl: String,
  thumbnailUrl: String,
  pngUrl: String,
  contentType: String,
  size: Number,
  originalUrl: String,
});
/**
 * A vector 3D with x, y, z at 2 decimal precision
 */
const schema = mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      index: true,
    },
    contractAddress: {
      type: String,
      index: true,
    },
    tokenId: String,
    tokenType: {
      type: String,
      enum: ["ERC721", "ERC1155", "ERC20"],
    },
    name: String,
    description: String,
    image: imageSchema,
    attributes: [attributeSchema],
    timeLastUpdated: Date,
    balance: String,
    acquiredAt: {
      blockTimestamp: Date,
      blockNumber: Number,
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ contract: 1, tokenId: 1 });
schema.index({ contractAddress: 1, tokenId: 1 });

module.exports = { schema };