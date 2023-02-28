/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: reactionSchema } = require("./reaction");
/**
 * Connection between account <=> thread M to M
 */
const schema = mongoose.Schema(
  {
    reactionObjectType: { type: String, enum: ["POST"], index: true },
    /** The object id for the reactionObjectType */
    reactionObjectTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    reactions: reactionSchema,
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
