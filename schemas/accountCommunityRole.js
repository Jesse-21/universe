/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * M to M between AccountCommunity and Role
 */
const schema = mongoose.Schema(
  {
    role: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Role",
      required: true,
    },
    accountCommunity: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "AccountCommunity",
      required: true,
    },
    /** If the accountCommunity is managed by the chain indexer.
     * default to inherit role's isManagedByIndexer property */
    isManagedByIndexer: { type: Boolean, index: true },
    // if the role is still valid, expired if indexer rules are not met
    isValid: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });

module.exports = { schema };
