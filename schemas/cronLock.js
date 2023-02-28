/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A lock for node-cron
 */
const schema = mongoose.Schema(
  {
    name: { type: String },
  },
  { timestamps: true }
);

module.exports = { schema };
