/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Community m to m relationship with quest
 * mainly to track the progress of the user
 */
const schema = mongoose.Schema(
  {
    // archived hide the quest when it is completed or vodi
    isArchived: { type: Boolean, default: false },
    // The community users who are participating in the quest
    accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Account" }],
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
    },
    quest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quest",
    },
  },
  { timestamps: true }
);

schema.index({ isArchived: 1, community: 1 });
schema.index({ accounts: 1 });
schema.index({ community: 1 });
schema.index({ quest: 1 });
schema.index({ community: 1, quest: 1 });

module.exports = { schema };
