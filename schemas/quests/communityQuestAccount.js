/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    isNotified: { type: Boolean, default: false },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Account",
    },

    communityQuest: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "CommunityQuest",
    },
  },
  { timestamps: true }
);

module.exports = { schema };
