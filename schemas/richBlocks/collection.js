/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const floorSchema = mongoose.Schema({
  floorPriceEth: { type: String }, // big number
  floorPriceUSD: { type: String }, // big number
  updatedAt: { type: String },
  collectionUrl: { type: String },
});
/**
 * An NFT collection with metadata, floor, etc
 */
const schema = mongoose.Schema({
  openseaFloor: [floorSchema],
  looksRareFloor: [floorSchema],
  contractAddress: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    ref: "Address",
  },
});

module.exports = { schema };
