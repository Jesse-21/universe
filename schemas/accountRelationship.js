/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    isFollowing: { type: Boolean, default: false }, // if from is following to
    isBlocking: { type: Boolean, default: false }, // if from is blocking to
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
