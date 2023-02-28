/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

/**
 * A vector 3D with x, y, z at 2 decimal precision
 */
const schema = mongoose.Schema({
  peerId: { type: String, required: true, index: true }, // the peer id
  username: { type: String, required: true }, // the peer username
  expiresAt: { type: Date }, // the last time the peer was updated
});

module.exports = { schema };
