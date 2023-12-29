/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: true,
  },
  rewardId: { type: mongoose.Types.ObjectId, index: true },
  rewardType: {
    type: String,
    enum: ["ASSET_3D", "SCORE", "IMAGE", "NFT"],
    index: true,
  },
  quantity: { type: Number, default: 1 },
  lastBlockHash: { type: String },
});

schema.index({ lastBlockHash: 1, rewardType: 1, account: 1 });
schema.index({ lastBlockHash: 1, rewardType: 1 });

module.exports = { schema };
