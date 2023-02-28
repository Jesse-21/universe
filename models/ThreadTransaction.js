const mongoose = require("mongoose");
// const { ethers } = require("ethers");

const { schema } = require("../schemas/threadTransaction");

// const { getMessageHash } = require("../helpers/get-message-hash");
class ThreadTransactionClass {
  static ping() {
    console.log("model: ThreadTransactionClass");
  }

  static async createNewStake({
    recipientId,
    senderId,
    nonce,
    tokenAmount,
    threadId,
    signature,
    transactionHash,
  }) {
    // @TODO verify thread is valid, sender and recipient valid
    return this.create({
      thread: threadId,
      signature,
      nonce,
      tokenAmount,
      sender: senderId,
      recipient: recipientId,
      transactionHash,
    });
  }

  static async completeTransaction({
    threadTransactionId,
    completionTransactionHash,
  }) {
    const found = await this.findById(threadTransactionId);
    if (!found) throw new Error("Invalid Transaction");
    found.completionTransactionHash = completionTransactionHash;
    found.isCompleted = true;
    return found.save();
  }
}

schema.loadClass(ThreadTransactionClass);

const ThreadTransaction =
  mongoose.models.ThreadTransaction ||
  mongoose.model("ThreadTransaction", schema);

module.exports = {
  ThreadTransaction,
};
