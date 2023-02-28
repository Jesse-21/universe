/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");
const { schema: contentSchema } = require("./content");

const schema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "MESSAGE_REQUEST",
        "POST_COMMENT",
        "POST_REACTION",
        "CONNECTION_REQUEST",
        "POST_MENTION",
      ],
      index: true,
    },
    content: contentSchema,
    title: { type: String },
    /** the initiator of the notification. can be null */
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    /** the receiver of the notification. */
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
      required: true,
    },
    /** the onclick action */
    externalUrl: {
      type: String,
    },
    /** the main image i.e avatar of the initiator */
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
    /** receiver last seen */
    lastSeen: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });

module.exports = { schema };
