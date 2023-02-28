const { AccountCommunity } = require("../../models/AccountCommunity");

class InitializeAccountCommunityService {
  /**
   * Create default account community
   * @returns {Promise<AccountCommunity>}
   */
  async createDefaultAccountCommunity(
    _,
    { communityId, joined = false },
    context
  ) {
    if (!communityId) throw new Error("Invalid community");

    const accountCommunity = await AccountCommunity.findOrCreate({
      accountId: context.accountId || context.account?._id,
      communityId: communityId,
      joined,
    });
    return accountCommunity;
  }

  /**
   * Initialize an account community for a community with the default public role
   * @returns {Promise<AccountCommunity>}
   */
  async initialize(parent, { communityId, joined }, context) {
    if (!communityId) throw new Error("Invalid community");

    const accountCommunity = await this.createDefaultAccountCommunity(
      parent,
      { communityId, joined },
      context
    );

    return accountCommunity;
  }
}

module.exports = { Service: InitializeAccountCommunityService };
