/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: peerSchema } = require("./peer/peer");

const schema = mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      index: true,
    },
    peers: {
      type: mongoose.Schema.Types.Map,
      of: peerSchema,
      default: {},
    },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ updatedAt: -1 });
schema.index({ joined: 1, community: 1 });

module.exports = { schema };
