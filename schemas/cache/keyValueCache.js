/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/** Generic key value cache */
const schema = mongoose.Schema(
  {
    key: { type: String, required: true, index: true }, // the cache key
    value: { type: String },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // default to 5 minutes from now
    }, // the cache expiration date. Null means no expiration
  },
  { timestamps: true }
);

module.exports = { schema };
