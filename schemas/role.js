/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("./content");

/**
 *
 */
const schema = mongoose.Schema(
  {
    description: contentSchema,
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    /** The icon or emoji string */
    icon: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    /** default role like admin and public cannot be edited or deleted */
    editable: { type: Boolean, default: false },
    /** The hex color string of the role */
    color: { type: String },
    /** The position of the role */
    position: { type: Number },
    /** If the role has indexerRules. Can be overwriten on a member level */
    isManagedByIndexer: { type: Boolean, default: false },
    /** The serialized permission string for glabal permission applied to role at a community level */
    /** Can be overwritten on a channel level by permissionOverwrite */
    permissionString: { type: String },
    /** List of rules to apply if isManagedByIndexer is true */
    indexerRules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "IndexerRule",
      },
    ],
    isHidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = { schema };
