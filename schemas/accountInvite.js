/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * Nonce is used to avoid repeat attack
 */
const schema = mongoose.Schema(
  {
    // how many times the code has been used
    useCount: {
      type: Number,
      default: 0,
    },
    // how many times the code can be used, -1 means unlimited
    maxUseCount: {
      type: Number,
      default: -1,
    },
    // if the code expires, null if it never expires
    expiresAt: {
      type: Date,
    },
    code: {
      type: String,
      required: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
