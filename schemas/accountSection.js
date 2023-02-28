/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("./content");

/**
 * An about section, i.e experience, education...
 */

const entrySchema = mongoose.Schema({
  title: { type: String },
  image: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image",
  }, // the main image
  content: contentSchema,
  link: { type: String },
});

const schema = mongoose.Schema(
  {
    title: { type: String, default: "Untitled section" },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    entries: [entrySchema],
    isVisible: { type: Boolean, default: false }, // i.e draft state
  },
  { timestamps: true }
);

module.exports = { schema };
