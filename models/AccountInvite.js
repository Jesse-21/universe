const mongoose = require("mongoose");

const { schema } = require("../schemas/accountInvite");

class AccountInviteClass {
  static ping() {
    console.log("model: AccountInviteClass");
  }

  /**
   * Find or create a default AccountInvite
   * @returns Promise<AccountInvite> || null
   */
  static async findOrCreate({ accountId, useCount, maxUseCount, expiresAt }) {
    const found = await this.findOne({
      account: accountId,
    });
    if (found) return found;
    return this.create({
      account: accountId,
      useCount,
      maxUseCount,
      expiresAt,
    });
  }
}

schema.loadClass(AccountInviteClass);

const AccountInvite =
  mongoose.models.AccountInvite || mongoose.model("AccountInvite", schema);

module.exports = {
  AccountInvite,
};
