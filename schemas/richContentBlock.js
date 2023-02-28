/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema({
  blockType: {
    type: String,
    enum: ["IMAGE", "LINK", "RICH_EMBED", "COLLECTION", "QUEST", "POST"],
    index: true,
  },
  /** The object id for the blockType */
  blockId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
});

module.exports = { schema };
