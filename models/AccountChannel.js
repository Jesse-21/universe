const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/accountChannel");

class AccountChannelClass {
  static ping() {
    console.log("model: AccountChannelClass");
  }
  /**
   * Find if there is an existing AccountChannel by accountId and channelId
   * @returns Promise<AccountChannel> || null
   */
  static async _existingAccountChannel({ accountId, channelId }) {
    if (!accountId || !channelId) return null;
    return this.findOne({ account: accountId, channel: channelId });
  }
  /**
   * Update an AccountChannel's lastSeen to the current date
   * @returns Promise<AccountChannel>
   */
  static async updateAccountChannelLastSeen({ accountId, channelId }) {
    const found = await this._existingAccountChannel({
      accountId,
      channelId,
    });
    if (!found) throw new Error("Invalid AccountChannel");

    found.userLastSeen = new Date();
    return found.save();
  }

  /**
   * Find or create a default accountChannel
   * @returns Promise<AccountChannel> || null
   */
  static async findOrCreate({ accountId, channelId, userLastSeen }) {
    const found = await this._existingAccountChannel({
      accountId,
      channelId,
    });
    if (found) {
      if (userLastSeen) {
        found.userLastSeen = userLastSeen;
        return await found.save();
      }
      return found;
    }

    return this.create({
      account: accountId,
      channel: channelId,
      userLastSeen: userLastSeen || new Date(),
    });
  }
}

schema.loadClass(AccountChannelClass);

const AccountChannel =
  mongoose.models.AccountChannel || mongoose.model("AccountChannel", schema);

module.exports = {
  AccountChannel,
};
