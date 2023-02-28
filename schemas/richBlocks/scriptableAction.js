/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 *
 */
const schema = mongoose.Schema(
  {
    title: { type: String, required: true, default: "New Script" },
    originalScriptUrl: { type: String },
    scriptUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = { schema };
