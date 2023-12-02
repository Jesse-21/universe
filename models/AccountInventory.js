const mongoose = require("mongoose");

const { schema } = require("../schemas/accountInventory");

class AccountInventoryClass {
  static ping() {
    console.log("model: AccountInventoryClass");
  }
  static async findAndSort({
    limit = 25,
    offset = 0,
    filters = {},
    sort = "-createdAt",
  } = {}) {
    let matchQuery = {};
    if (filters.account) {
      matchQuery = {
        ...matchQuery,
        account: mongoose.Types.ObjectId(filters.account),
      };
    }
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    const accountInventory = await this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);

    return accountInventory;
  }

  static async createOrUpdate({
    rewardId,
    rewardType,
    quantity = 0,
    accountId,
    modifier = 0,
  }) {
    /** step1: mandatory sanitize check */
    if (!rewardId || !accountId) {
      throw new Error("Missing required parameters");
    }
    /** step2: check for existing */
    const existing = await this.findOne({
      rewardId: rewardId,
      rewardType: rewardType,
      account: accountId,
    });
    let finalQuantity = quantity;
    if (modifier) {
      if (existing?.quantity) {
        finalQuantity = existing.quantity + modifier;
      } else {
        finalQuantity = quantity + modifier;
      }
    }
    if (existing) {
      existing.quantity = finalQuantity;
      return await existing.save();
    }

    /** step2: create the CommunityQuest */
    const communityQuestAccountInventory = await this.create({
      rewardId: rewardId,
      rewardType: rewardType,
      quantity: finalQuantity,
      account: accountId,
    });

    return communityQuestAccountInventory;
  }
}

schema.loadClass(AccountInventoryClass);

const AccountInventory =
  mongoose.models.AccountInventory ||
  mongoose.model("AccountInventory", schema);

module.exports = {
  AccountInventory,
};
