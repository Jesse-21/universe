const mongoose = require("mongoose");

const { Role } = require("../../models/Role");

const { Service: _CommunityService } = require("../CommunityService");
const {
  Service: _AccountCommunityService,
} = require("../AccountCommunityService");
const { Service: RoleService } = require("../RoleService");

const { AccountCommunity } = require("../../models/AccountCommunity");
const { Account } = require("../../models/Account");

class RoleMutationService extends RoleService {
  async _canAdminRoleCommunityOrError(role, props, context) {
    if (!role) throw new Error("Invalid role");
    const CommunityService = new _CommunityService();
    await role.populate("community");
    const canAdmin = await CommunityService.canAdmin(
      role.community,
      props,
      context
    );
    if (!canAdmin) {
      throw new Error("You do not have permission to edit the role.");
    }
    return true;
  }
  /**
   * Update a role's permission if authorized
   * @returns Promise<Role>
   */
  async updateRolePermissionsOrUnauthorized(_, { roleId, ...props }, context) {
    const role = await Role.findById(roleId);
    await this._canAdminRoleCommunityOrError(role, { roleId }, context);
    return await this.updateRolePermissions(role, props, context);
  }
  /**
   * Edit a role if authorized
   * @returns Promise<Role>
   */
  async editRoleOrUnauthorized(_, { roleId, roleInput }, context) {
    const role = await Role.findById(roleId);
    await this._canAdminRoleCommunityOrError(role, { roleId }, context);

    if (!role?.editable) {
      throw new Error("You do not have permission to edit the role.");
    }
    return await role.edit(roleInput);
  }
  /**
   * Delete a role if authorized
   * @returns Promise<String>
   */
  async deleteRoleOrUnauthorized(_, { roleId }, context) {
    const role = await Role.findById(roleId);
    await this._canAdminRoleCommunityOrError(role, { roleId }, context);

    if (!role?.editable) {
      throw new Error("You do not have permission to delete the role.");
    }
    return await role.delete();
  }
  /**
   * Grant a role to account if authorized
   * @returns Promise<AccountCommunityRole>
   */
  async grantRoleOrUnauthorized(_, { roleId, accountId, address }, context) {
    const role = await Role.findById(roleId);
    await this._canAdminRoleCommunityOrError(role, { roleId }, context);

    if (!role?.editable) {
      throw new Error("You do not have permission to grant the role.");
    }

    // 1. find or create the account community
    let accountCommunity = null;
    if (accountId) {
      accountCommunity = await AccountCommunity.findOrCreate({
        accountId: mongoose.Types.ObjectId(accountId),
        communityId: role.community,
      });
    } else if (address) {
      const account = await Account.findOrCreateByAddressAndChainId({
        address,
        chainId: 1,
      });
      accountCommunity = await AccountCommunity.findOrCreate({
        accountId: account._id,
        communityId: role.community,
      });
    }

    // 2. grant role to account community
    const AccountCommunityService = new _AccountCommunityService();
    return await AccountCommunityService.grantRole(accountCommunity, {
      roleId: role._id,
      isManagedByIndexer: false,
      isValid: true,
    });
  }
  /**
   * Revoke a role to account if authorized
   * @returns Promise<AccountCommunityRole>
   */
  async revokeRoleOrUnauthorized(_, { roleId, accountId, address }, context) {
    const role = await Role.findById(roleId);
    await this._canAdminRoleCommunityOrError(role, { roleId }, context);

    if (!role?.editable) {
      throw new Error("You do not have permission to revoke the role.");
    }

    // 1. find the account community
    let accountCommunity = null;
    if (accountId) {
      accountCommunity = await AccountCommunity.findOne({
        account: mongoose.Types.ObjectId(accountId),
        community: role.community,
      });
    } else if (address) {
      const account = await Account.findByAddressAndChainId({
        address,
        chainId: 1,
      });
      if (!account) throw new Error("Invalid Account Community");
      accountCommunity = await AccountCommunity.findOne({
        account: account._id,
        community: role.community,
      });
    }
    if (!accountCommunity) throw new Error("Invalid Account Community");

    // 2. revoke role to account community
    const AccountCommunityService = new _AccountCommunityService();
    return await AccountCommunityService.revokeRole(accountCommunity, {
      roleId: role._id,
    });
  }
  /**
   * Create an indexer rule for role if authorized
   * @returns {Promise<IndexerRule>}
   */
  async createIndexerRuleForRoleOrUnauthorized(
    _,
    { roleId, ruleDataInput = {} },
    context
  ) {
    const role = await Role.findById(roleId);
    await this._canAdminRoleCommunityOrError(role, { roleId }, context);

    const indexerRuleType = ruleDataInput.indexerRuleType;
    let ruleData;
    switch (indexerRuleType) {
      case "NFT":
        ruleData = ruleDataInput.indexerRuleNFTInput;
        break;
      case "ALLOWLIST":
        ruleData = ruleDataInput.indexerRuleAllowlistInput;
        break;
      case "API":
        ruleData = ruleDataInput.indexerRuleAPIInput;
        break;
      default:
        ruleData = null;
    }

    return await this.createIndexerRuleForRole(
      role,
      {
        indexerRuleType,
        ruleData,
      },
      context
    );
  }
}

module.exports = { Service: RoleMutationService };
