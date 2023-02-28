/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");
const { schema: richContentSchema } = require("./richContent");

/**
 * A message. 1 to M with thread, 1 to M with account
 */
const schema = mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      index: true,
    },
    richContent: richContentSchema,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });

module.exports = { schema };
