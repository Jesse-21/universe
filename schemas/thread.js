/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A single thread. M to M with account
 */
const schema = mongoose.Schema(
  {
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ThreadMessage",
      },
    ], // the messages of thread
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ThreadTransaction",
      },
    ], // the token transactions
  },
  { timestamps: true }
);

module.exports = { schema };
