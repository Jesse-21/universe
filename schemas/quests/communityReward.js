/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { questRewardsSchema } = require("./quest");

const schema = mongoose.Schema(
  {
    // archived hide the community reward when it is completed or void
    isArchived: { type: Boolean, default: false },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Community",
    },
    // the amount of score necessary to complete the quest
    score: { type: Number, default: 0 },
    reward: questRewardsSchema,
    type: {
      type: String,
      enum: ["EXCHANGE", "BATTLE_PASS"], // EXCHANGE: exchange score for reward, BATTLE_PASS: free reward for x score
    },
    claimableQuantity: { type: Number, default: -1 }, // -1 means unlimited
  },
  { timestamps: true }
);

module.exports = { schema };
