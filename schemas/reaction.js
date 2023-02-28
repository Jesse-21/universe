/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = { schema };
