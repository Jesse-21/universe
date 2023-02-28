/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: contentSchema } = require("../content");
const { schema: keyValueFieldsSchema } = require("../keyValueFields");

/**
 *
 */
const schema = mongoose.Schema(
  {
    description: contentSchema,
    title: { type: String },
    timestamp: { type: Date },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    thumbnail: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Image",
    },
    color: { type: String },
    url: { type: String },
    /** Array of key value fields of any value */
    fields: [keyValueFieldsSchema],
  },
  { timestamps: true }
);

module.exports = { schema };
