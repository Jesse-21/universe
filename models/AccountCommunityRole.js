const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/accountCommunityRole");

class AccountCommunityRoleClass {
  static ping() {
    console.log("model: AccountCommunityRoleClass");
  }

  static async createOrUpdate({
    roleId,
    accountCommunityId,
    isManagedByIndexer,
    isValid,
  }) {
    /** step1: mandatory sanitize check */
    if (!roleId || !accountCommunityId) {
      throw new Error("Missing required parameters");
    }
    /** step2: check for existing */
    const existing = await AccountCommunityRole.findOne({
      role: roleId,
      accountCommunity: accountCommunityId,
    });
    if (existing) {
      existing.isValid = isValid;
      existing.isManagedByIndexer = isManagedByIndexer;
      return existing.save();
    }

    /** step3: create the AccountCommunityRole */
    const accountCommunityRole = new AccountCommunityRole({
      accountCommunity: mongoose.Types.ObjectId(accountCommunityId),
      role: mongoose.Types.ObjectId(roleId),
      isManagedByIndexer: !!isManagedByIndexer,
      isValid, // default to true when creating
    });

    return accountCommunityRole.save();
  }

  static async findOrCreate({
    roleId,
    accountCommunityId,
    isManagedByIndexer,
    isValid,
  }) {
    /** step1: mandatory sanitize check */
    if (!roleId || !accountCommunityId) {
      throw new Error("Missing required parameters");
    }
    /** step2: check for existing */
    const existing = await AccountCommunityRole.findOne({
      role: roleId,
      accountCommunity: accountCommunityId,
    });
    if (existing) return existing;

    /** step2: create the AccountCommunityRole */
    const accountCommunityRole = new AccountCommunityRole({
      accountCommunity: mongoose.Types.ObjectId(accountCommunityId),
      role: mongoose.Types.ObjectId(roleId),
      isManagedByIndexer: !!isManagedByIndexer,
      isValid, // default to true when creating
    });

    return accountCommunityRole.save();
  }

  /**
   * Find AccountCommunityRole[] and sort
   * @returns AccountCommunity[]
   */
  static async findAndSort({
    limit = 20,
    offset = 0,
    filters = {},
    sort = "_id",
  } = {}) {
    let matchQuery = {};
    if (filters.accountCommunity) {
      matchQuery = {
        ...matchQuery,
        accountCommunity: mongoose.Types.ObjectId(filters.accountCommunity),
      };
    }
    if (filters.role) {
      matchQuery = {
        ...matchQuery,
        role: mongoose.Types.ObjectId(filters.role),
      };
    }
    if (filters.isValid !== undefined) {
      matchQuery = {
        ...matchQuery,
        isValid: !!filters.isValid,
      };
    }
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    return this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
  }
}

schema.loadClass(AccountCommunityRoleClass);

const AccountCommunityRole =
  mongoose.models.AccountCommunityRole ||
  mongoose.model("AccountCommunityRole", schema);

module.exports = {
  AccountCommunityRole,
};
