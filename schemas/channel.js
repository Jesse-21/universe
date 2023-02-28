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
    slug: { type: String, index: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Account",
    },

    /** The emoji or image of the channel */
    icon: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    /** Permissions  that overwrite role's permissions */
    /** https://discord.com/developers/docs/topics/permissions#permission-overwrites */
    permissionsOverwrite: [
      {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "PermissionOverwrite",
      },
    ],
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "ChannelRecipient",
      },
    ],

    /** Cached fields for easy sorting */
    lastPost: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Post",
    },
    lastPostCreatedAt: { type: Date, index: true },

    /** If channel is deleted */
    isHidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = { schema };
