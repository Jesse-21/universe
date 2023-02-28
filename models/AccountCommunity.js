const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/accountCommunity");

class AccountCommunityClass {
  static ping() {
    console.log("model: AccountCommunityClass");
  }
  /**
   * Find if there is an existing AccountCommunity by accountId and communityId
   * @returns Promise<AccountCommunity> || null
   */
  static async _existingAccountCommunity({ accountId, communityId }) {
    if (!accountId || !communityId) return null;
    return this.findOne({ account: accountId, community: communityId });
  }

  /**
   * Update or create accountCommunity with props
   * @returns Promise<AccountCommunity> || null
   */
  static async updateOrCreate({ accountId, communityId, ...props }) {
    const found = await this._existingAccountCommunity({
      accountId,
      communityId,
    });
    if (found) {
      found.joined = !!props.joined;
      return found.save();
    }
    return this.create({
      account: accountId,
      community: communityId,
      ...props,
    });
  }

  /**
   * Find or create a default accountCommunity
   * @returns Promise<AccountCommunity> || null
   */
  static async findOrCreate({ accountId, communityId, joined = false }) {
    const found = await this._existingAccountCommunity({
      accountId,
      communityId,
    });
    if (found) return found;
    return this.create({
      account: accountId,
      community: communityId,
      joined,
    });
  }

  /**
   * Find AccountCommunity[] and sort
   * @returns AccountCommunity[]
   */
  static async findAndSort({
    limit = 25,
    offset = 0,
    filters = {},
    sort = "_id",
  } = {}) {
    let matchQuery = {};
    if (filters.account) {
      matchQuery = {
        ...matchQuery,
        account: mongoose.Types.ObjectId(filters.account),
      };
    }
    if (filters.community) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.community),
      };
    }
    if (filters.joined !== undefined) {
      matchQuery = {
        ...matchQuery,
        joined: !!filters.joined,
      };
    }
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    const accountCommunities = await this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);

    return accountCommunities;
  }

  /**
   * Update an AccountCommunity's lastSeen to the current date
   * @returns Promise<AccountCommunity>
   */
  static async updateAccountCommunityLastSeen({ accountId, communityId }) {
    const found = await this._existingAccountCommunity({
      accountId,
      communityId,
    });
    if (!found) throw new Error("Invalid AccountCommunity");

    found.lastSeen = new Date();
    return found.save();
  }

  /**
   * Update an AccountCommunity's joined to true/false
   * @returns Promise<AccountCommunity>
   */
  static async updateAccountCommunityJoined({
    accountId,
    communityId,
    joined,
  }) {
    const found = await this._existingAccountCommunity({
      accountId,
      communityId,
    });
    if (!found) throw new Error("Invalid AccountCommunity");

    found.joined = !!joined;
    return found.save();
  }
}

schema.loadClass(AccountCommunityClass);

const AccountCommunity =
  mongoose.models.AccountCommunity ||
  mongoose.model("AccountCommunity", schema);

module.exports = {
  AccountCommunity,
};
