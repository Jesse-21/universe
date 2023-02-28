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
    accounts: [
      { type: mongoose.Schema.Types.ObjectId, index: true, ref: "Account" },
    ],
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    quest: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Quest",
    },
  },
  { timestamps: true }
);

module.exports = { schema };
