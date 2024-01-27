/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      index: true,
    },
    joined: {
      type: Boolean,
      default: false,
      index: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AccountCommunityRole",
        index: true,
      },
    ],
    // the amount of tokens that the account has held from the community's primary contract
    // this is a temporary field that should be removed when the indexer/wss is ready
    tokenCount: {
      type: Number,
      default: 0,
      index: true,
    },
    // last time account visited community
    lastSeen: { type: Date, default: () => new Date(), index: true },
    // last time account joined community, use to revalidate membership status
    joinedDate: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });
schema.index({ joined: 1, community: 1 });

module.exports = { schema };
