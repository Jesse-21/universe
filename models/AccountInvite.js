const mongoose = require("mongoose");

const { schema } = require("../schemas/accountInvite");

const crypto = require("crypto");

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
      code: `${crypto.randomInt(10000000, 100000000)}`,
    });
  }
}

schema.loadClass(AccountInviteClass);

const AccountInvite =
  mongoose.models.AccountInvite || mongoose.model("AccountInvite", schema);

module.exports = {
  AccountInvite,
};
