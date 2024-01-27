/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    isNotified: { type: Boolean, default: false },
    rewardClaimedCount: { type: Number, default: 0 },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Account",
    },
    communityReward: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "CommunityReward",
    },
  },
  { timestamps: true }
);

module.exports = { schema };
