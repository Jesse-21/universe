/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    /** The id of object type, i.e a role Id or a User Id */
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: true,
    },

    // const objectType = {
    //     0: user,
    //     1: role,
    // }
    recipientType: { type: Number, index: true, required: true },
    // role@bebdomain.cast or address@bebdomain.cast
    slug: { type: String, index: true, required: true },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      index: true,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = { schema };
