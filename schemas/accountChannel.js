/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Connection between account <=> thread M to M
 */
const schema = mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      index: true,
    },
    // the last time account has seen a thread
    userLastSeen: { type: Date, default: () => new Date() },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
