const mongoose = require("mongoose");

const { Post } = require("../models/Post");
const { Role } = require("../models/Role");
const { AccountCommunityRole } = require("../models/AccountCommunityRole");

const { Service: _RoleService } = require("./RoleService");
const {
  Service: _AccountCommunityRoleService,
} = require("./AccountCommunityRoleService");

class AccountCommunityService {
  /**
   * create a AccountCommunityRole for account community, can be done by indexer or user
   * then add the role to the account community roles array
   * If the role is already in the account community roles array, update the role
   * @param {AccountCommunity} accountCommunity
   * @param {ObjectId} roleId the role's id
   * @returns {Promise<AccountCommunityRole>}
   */
  async createOrUpdateRoleForAccountCommunity(
    accountCommunity,
    { roleId, isManagedByIndexer, isValid = true }
  ) {
    if (!accountCommunity || !accountCommunity.community)
      throw new Error("Invalid account community");
    const AccountCommunityRoleService = new _AccountCommunityRoleService();
    const accountCommunityRole =
      await AccountCommunityRoleService.createOrUpdateAccountCommunityRole(
        accountCommunity,
        {
          roleId,
          isManagedByIndexer,
          isValid,
        }
      );

    // add the role to the account community roles array if not existing
    if (!accountCommunity.roles.includes(accountCommunityRole._id)) {
      accountCommunity.roles.push(accountCommunityRole._id);
      await accountCommunity.save();
    }

    return accountCommunityRole;
  }

  /**
   * Determine if the account can perform permission with all its roles
   * @returns Promise<Boolean>
   */
  async validPermissionForAccountCommunity(
    accountCommunity,
    { permissionIdentifier, permissionId, channelId },
    context
  ) {
    const roles = await this.getAccountCommunityRoles(accountCommunity, {
      includeDefault: true, // include the public '@everyone' role
    });

    // loop through roles and check if the account has the permission for any role
    const RoleService = new _RoleService();
    return RoleService.hasPermissionForRoles(
      roles,
      {
        permissionIdentifier,
        permissionId,
        channelId,
      },
      context
    );
  }

  async countUnseenPostsCount(accountCommunity, _, context = {}) {
    if (!accountCommunity?.lastSeen || !accountCommunity?.community) return 0;

    /** use this hack to optimize count query */
    const posts = await Post.find({
      community: accountCommunity.community,
      account: { $ne: context.accountId },
      createdAt: { $gt: new Date(accountCommunity?.lastSeen) },
    })
      .select("id")
      .sort({ createdAt: -1 })
      .limit(20);

    return posts?.length || 0;
  }

  /**
   * Get all roles that the account community has
   * @param {AccountCommunity} accountCommunity
   * @param {Boolean} includeDefault - include the default @everyone(public) role
   * @returns {Promise<Role[]>}
   */
  async getAccountCommunityRoles(
    accountCommunity,
    { includeDefault = true } = {}
  ) {
    if (!accountCommunity) return [];
    const accountCommunityWithRoles = await accountCommunity.populate({
      path: "roles",
      match: {
        isValid: true,
      },
      populate: {
        path: "role",
      }, // populate role document in account community roles
    });

    const rawRoles =
      accountCommunityWithRoles?.roles?.map?.(
        (accountCommunityRole) => accountCommunityRole.role
      ) || [];
    // only return the roles that are not deleted
    const roles = rawRoles.filter((role) => role && role.isHidden !== true);
    if (!includeDefault) return roles;

    const defaultRole = await Role.findDefaultPublicRoleForCommunity({
      communityId: accountCommunity.community,
    });
    if (defaultRole) roles.push(defaultRole);
    return roles;
  }

  /**
   * Inplicitly revoke a role for an account community
   * @param {AccountCommunity} accountCommunity
   * @returns {Promise<AccountCommunityRole>}
   * */
  async revokeRole(accountCommunity, { roleId }) {
    if (!accountCommunity) throw new Error("Invalid account community");
    const accountCommunityRole = await AccountCommunityRole.findOneAndUpdate(
      {
        accountCommunity: accountCommunity._id,
        isValid: true,
        role: mongoose.Types.ObjectId(roleId),
      },
      {
        isValid: false,
        isManagedByIndexer: false, // revoked role is not managed by indexer
      }
    );

    return accountCommunityRole;
  }
  /**
   * Alias for createOrUpdateRoleForAccountCommunity
   * @param {AccountCommunity} accountCommunity
   * @returns {Promise<AccountCommunityRole>}
   * */
  async grantRole(accountCommunity, props) {
    return this.createOrUpdateRoleForAccountCommunity(accountCommunity, props);
  }
}

module.exports = { Service: AccountCommunityService };
