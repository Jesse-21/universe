/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { questRewardsSchema } = require("./quest");

const schema = mongoose.Schema(
  {
    // archived hide the quest when it is completed or vodi
    isArchived: { type: Boolean, default: false },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    // the amount of score necessary to complete the quest
    score: { type: Number, default: 300, min: 300, max: 850 },
    reward: questRewardsSchema,
  },
  { timestamps: true }
);

module.exports = { schema };
