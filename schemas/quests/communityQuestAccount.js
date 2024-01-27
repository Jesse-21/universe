/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    isNotified: { type: Boolean, default: false },
    rewardClaimed: { type: Boolean, default: false },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    communityQuest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityQuest",
    },
  },
  { timestamps: true }
);

schema.index({ isNotified: 1 });
schema.index({ account: 1 });
schema.index({ isNotified: 1, account: 1 });
schema.index({ communityQuest: 1, account: 1 });

module.exports = { schema };
