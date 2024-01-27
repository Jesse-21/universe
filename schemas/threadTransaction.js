/* eslint-disable no-inline-comments */
const mongoose = require("mongoose");

const { schema: addressSchema } = require("./address");

const { getRandomUint256 } = require("../helpers/get-random-uint256");

/**
 * A transaction on chain. 1 to M with thread
 */
const schema = mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      index: true,
    },
    signature: { type: String }, // the signature by the thread sender
    nonce: { type: String, default: () => `${getRandomUint256()}` },
    tokenAddress: addressSchema, // default to Matic
    // completed when recipient deny or accept the transaction.
    // if completed and amount left, the 'from' account can withdraw the token
    isCompleted: { type: Boolean, default: false },
    tokenAmount: { type: String },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    transactionHash: { type: String },
    completionTransactionHash: { type: String },
  },
  { timestamps: true }
);

module.exports = { schema };
