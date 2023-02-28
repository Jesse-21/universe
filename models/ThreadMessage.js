const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { AccountThread } = require("./AccountThread");

const { schema } = require("../schemas/threadMessage");

const { Service: ContentService } = require("../services/ContentService");

class ThreadMessageClass {
  static ping() {
    console.log("model: ThreadMessageClass");
  }

  /**
   * Verify if sender Id has access to thread
   * @returns Error or true
   */
  static async _verifyThreadAndSender({ threadId, senderId }) {
    const found = await AccountThread.exists({
      thread: threadId,
      account: senderId,
    });
    if (!found) throw new Error("Invalid Thread or Sender");
    return true;
  }

  /**
   * Create a new message for thread Id
   * @returns Promise<ThreadMessage>
   */
  static async createForThread({
    threadId,
    senderId,
    contentRaw,
    contentJson,
    contentHtml,
    blocks,
  }) {
    await ThreadMessage._verifyThreadAndSender({ threadId, senderId });
    const richContent = await new ContentService().makeRichContent({
      contentRaw,
      contentJson,
      contentHtml,
      blocks,
    });
    const threadMessage = await ThreadMessage.create({
      richContent,
      sender: senderId,
      thread: threadId,
    });
    return threadMessage;
  }
}

schema.loadClass(ThreadMessageClass);

const ThreadMessage =
  mongoose.models.ThreadMessage || mongoose.model("ThreadMessage", schema);

module.exports = {
  ThreadMessage,
};
