const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/notification");

const { Service: ContentService } = require("../services/ContentService");

class NotificationClass {
  static ping() {
    console.log("model: NotificationClass");
  }

  /**
   * Update all last seen null notifications for account to current date
   * @returns Promise<Int> updateAcount
   */
  static async updateUnseenNotifications(accountId) {
    const res = await this.updateMany(
      { lastSeen: null, account: accountId },
      { lastSeen: new Date() }
    );
    return res.modifiedCount;
  }

  /**
   * Update last seen to current date
   * @returns Promise<Notification>
   */
  static async updateLastSeen(id) {
    const notification = await this.findById(id);
    if (!notification) return null;
    notification.lastSeen = new Date();
    return notification.save;
  }
  /**
   * Create a new notification for receiver
   * @returns Promise<Notification>
   */
  static async createForReceiver({
    initiatorId,
    receiverId,
    type,
    contentRaw,
    contentJson,
    contentHtml,
    externalUrl,
    imageId,
    title,
  }) {
    const content = new ContentService().makeContent({
      contentRaw,
      contentJson,
      contentHtml,
    });

    const existing = await this.findOne(
      {
        type,
        title,
        "content.raw": content.raw,
        "content.json": content.json,
        "content.html": content.html,
        initiator: initiatorId,
        receiver: receiverId,
        externalUrl,
        image: imageId,
      },
      { "content.$": 1 }
    );
    if (existing) return null;

    /** @TODO verify the initiator is valid*/
    return this.create({
      type,
      title,
      content: content,
      initiator: initiatorId,
      receiver: receiverId,
      externalUrl,
      image: imageId,
    });
  }
}

schema.loadClass(NotificationClass);

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", schema);

module.exports = {
  Notification,
};
