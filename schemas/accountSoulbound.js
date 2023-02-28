/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    /** @TODO abstract Token to its own model? */
    tokenId: { type: Number, default: 0, index: true, required: true },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
