/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: richContentSchema } = require("./richContent");

const schema = mongoose.Schema(
  {
    richContent: richContentSchema,
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
      required: true,
    },
    externalId: { type: String, index: true }, // an external id for the post, can be used to link to other services
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    }, // the parent post
    root: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    }, // the root post
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      index: true,
    }, // the parent community
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      index: true,
    }, // the parent community
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        index: true,
      },
    ], // all comments to post
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });
schema.index({ community: 1, createdAt: -1 });
schema.index({ isHidden: 1, parent: 1, channel: 1, community: 1 });

module.exports = { schema };
