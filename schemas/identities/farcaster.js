/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A Farcaster Identity Graph
 */
const schema = mongoose.Schema({
  directoryUrl: { type: String },
  avatarUrl: { type: String },
  username: { type: String, index: true },
  displayName: { type: String },
  farcasterAddress: { type: String, index: true },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    index: true,
  },
});

module.exports = { schema };
