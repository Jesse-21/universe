const { Role } = require("../models/Role");
const { AccountCommunityRole } = require("../models/AccountCommunityRole");

class AccountCommunityRoleService {
  /**
   * assign a role in community for account, can be done by indexer or manually
   * create an AccountCommunityRole M to M joint between AccountCommunity and Role
   * @param {Account} account
   * @param {ObjectId} communityId the community's id
   * @param {ObjectId} roleId the role's id
   * @returns {Promise<AccountCommunityRole>}
   */
  async findOrcreateAccountCommunityRole(
    accountCommunity,
    { roleId, isManagedByIndexer = undefined, isValid = true }
  ) {
    if (!accountCommunity?.community) throw new Error("Invalid community");
    const role = await Role.findById(roleId);
    if (!role || !accountCommunity)
      throw new Error("Invalid role id or community id ");

    const _isManagedByIndexer =
      isManagedByIndexer === undefined
        ? role.isManagedByIndexer
        : isManagedByIndexer;

    const accountCommunityRole = await AccountCommunityRole.findOrCreate({
      accountCommunityId: accountCommunity._id,
      roleId: role._id,
      isManagedByIndexer: _isManagedByIndexer,
      isValid,
    });

    return accountCommunityRole;
  }

  /**
   * assign a role in community for account, can be done by indexer or manually
   * @param {Account} account
   * @param {ObjectId} communityId the community's id
   * @param {ObjectId} roleId the role's id
   * @returns {Promise<AccountCommunityRole>}
   */
  async createOrUpdateAccountCommunityRole(
    accountCommunity,
    { roleId, isManagedByIndexer = undefined, isValid = true }
  ) {
    if (!accountCommunity?.community) throw new Error("Invalid community");
    const role = await Role.findById(roleId);
    if (!role || !accountCommunity)
      throw new Error("Invalid role id or community id ");

    const _isManagedByIndexer =
      isManagedByIndexer === undefined
        ? role.isManagedByIndexer
        : isManagedByIndexer;

    const accountCommunityRole = await AccountCommunityRole.createOrUpdate({
      accountCommunityId: accountCommunity._id,
      roleId: role._id,
      isManagedByIndexer: _isManagedByIndexer,
      isValid,
    });

    return accountCommunityRole;
  }
}

module.exports = { Service: AccountCommunityRoleService };
