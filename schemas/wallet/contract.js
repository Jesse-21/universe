/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema({
  address: {
    type: String,
    index: true,
  },
  chainId: Number,
  name: String,
  symbol: String,
  totalSupply: Number,
  tokenType: String,
  contractDeployer: String,
  deployedBlockNumber: Number,
  metadata: {
    floorPrice: Number,
    collectionName: String,
    collectionSlug: String,
    safelistRequestStatus: String,
    imageUrl: String,
    description: String,
    externalUrl: String,
    twitterUsername: String,
    discordUrl: String,
    bannerImageUrl: String,
    lastIngestedAt: Date,
  },
  isSpam: Boolean,
});

schema.index({ address: 1, chainId: 1 });

module.exports = { schema };
