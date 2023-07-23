const { AccountCommunity } = require("../models/AccountCommunity");
const { Community } = require("../models/Community");
const { AccountNonce } = require("../models/AccountNonce");
const { AccountAddress } = require("../models/AccountAddress");
const { Role } = require("../models/Role");
const { ChannelRecipient } = require("../models/ChannelRecipient");
const { Channel } = require("../models/Channel");

const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");

const {
  Service: _AccountCommunityService,
} = require("./AccountCommunityService");
const { Service: _CacheService } = require("./cache/CacheService");
const { Service: _RoleService } = require("./RoleService");

class AccountService {
  /**
   * Get the all roles Ids of an account in a community with cache
   * @param {Account} account
   * @returns Promise<Array<ID>> roleIds
   */
  async _getCachedRoleIds(account) {
    const getRoleIds = async () => {
      const claimedRoles = await this.getRoles(account);
      const claimedRolesIds = claimedRoles
        .filter((role) => role?._id)
        .map((role) => role._id);
      return claimedRolesIds;
    };

    const CacheService = new _CacheService();
    const roleIds = await CacheService.getOrCallbackAndSet(getRoleIds, {
      key: "ClaimedRoles",
      params: {
        accountId: account._id,
      },
      expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 mins from now
    });
    return roleIds;
  }
  async updateCurrentAddress(account, { address: rawAddress, signature }) {
    const address = validateAndConvertAddress(rawAddress);
    const existing = await AccountAddress.exists({ address });
    if (existing) throw new Error("An account already exists with the address");

    const accountNonce = await AccountNonce.findOne({
      account: account._id,
    });
    const verifyAgainstAddress = await accountNonce.decodeAddressBySignature(
      signature
    );

    if (verifyAgainstAddress.toLowerCase() !== address.toLowerCase())
      throw new Error("Unauthorized");
    if (!accountNonce) throw new Error("Nonce not found");

    const accountAddress = await AccountAddress.findOneAndUpdate(
      {
        _id: account.addresses[0],
      },
      {
        address,
      },
      {
        returnDocument: "after",
      }
    );

    await accountNonce.generateNewNonce();

    return accountAddress;
  }
  /**
   * Determine if an account can claim a roleId in a community
   * @param {Account} account
   * @param {ObjectId} roleId
   * @returns Promise<Boolean>
   */
  async canClaimRole(account, { roleId }) {
    if (!account?._id || !roleId) return false;
    const RoleService = new _RoleService();

    const address = await AccountAddress.findById(account.addresses[0]);
    const role = await Role.findById(roleId);

    const canClaim = await RoleService.canClaimRole(role, {
      address: address.address,
      account: account,
    });
    return canClaim;
  }

  /**
   * Create a AccountCommunityRole depending on the role that can be claimed by the account
   * This require the account to be logged in
   * @param {Account} account
   * @param {ObjectId} communityId
   * @returns Promise<AccountCommunityRole>
   */
  async claimRole(account, { roleId }) {
    if (!account?._id || !roleId) {
      throw new Error("Invalid account or roleId");
    }
    const claimableRole = await this.canClaimRole(account, { roleId });
    if (!claimableRole) {
      throw new Error("Cannot claim role");
    }

    const role = await Role.findById(roleId);
    const AccountCommunityService = new _AccountCommunityService();

    const accountCommunity = await AccountCommunity.findOrCreate({
      accountId: account._id,
      communityId: role.community,
    });

    const accountCommunityRole =
      await AccountCommunityService.createOrUpdateRoleForAccountCommunity(
        accountCommunity,
        {
          roleId: role._id,
          isManagedByIndexer: role.isManagedByIndexer,
        }
      );

    return accountCommunityRole;
  }
  /**
   * Get all roles that are claimed by the account
   * Note: this contains communities that the account is not a member of
   * @param {Account} account
   * @returns Promise<AccountCommunityRole[]>
   */
  async getRoles(account) {
    if (!account?._id) return [];
    // 1. get all account communities
    const accountCommunities = await AccountCommunity.find({
      account: account._id,
      community: { $exists: true },
    });

    // 2 get all account communities' roles
    const AccountCommunityService = new _AccountCommunityService();
    const allRoles = await Promise.all(
      accountCommunities.map(async (accountCommunity) => {
        const roles = await AccountCommunityService.getAccountCommunityRoles(
          accountCommunity,
          {
            includeDefault: true,
          }
        );
        return roles;
      })
    );

    const accountCommunityRoles = allRoles.flat();
    return accountCommunityRoles;
  }

  /**
   * Get all Channels that account and its roles are recipients of
   * @param {Account} account
   * @param {Object} args limit, offset...
   * @param {ChannelFilters} filters
   * @returns Promise<Channel[]>
   * */
  async getChannelsByRolesAndAccount(account, { filters = {}, ...args } = {}) {
    if (!account?._id) return [];
    const roleIds = await this._getCachedRoleIds(account);

    return Channel.findAndSort({
      ...args,
      sort: "-lastPostCreatedAt",
      filters: { ...filters, recipientIds: [...roleIds, account._id] },
    });
  }

  /**
   * Get all ChannelRecipient that account and its roles are recipients of
   * @param {Account} account
   * @param {Object} args limit, offset...
   * @param {ChannelRecipientFilters} filters
   * @returns Promise<ChannelRecipient[]>
   * */
  async getChannelRecipientsByRolesAndAccount(
    account,
    { filters = {}, ...args } = {}
  ) {
    if (!account?._id) return [];
    const roleIds = await this._getCachedRoleIds(account);

    // @TODO this should be refactored as the recipientIds do not take into account the difference
    // between roles and accounts, so might have IDs collision
    // ways to refactor:
    // 1. have a recipientType filter
    // 2. filter results after database query
    // 3. change database recipientID field to be Role:RoleID or Account:AccountID instead of just ID
    return ChannelRecipient.findAndSort({
      ...args,
      filters: { ...filters, recipientIds: [...roleIds, account._id] },
    });
  }

  /**
   * Refresh the account's roles and return list of roles available to the account in a community
   * @param {Account} account
   * @param {ObjectId} communityId
   * @returns Promise<Role[]>
   */
  async refreshRoles(account, { communityId }) {
    if (!account?._id || !communityId) return [];
    const RoleService = new _RoleService();
    const communityWithRoles = await Community.findById(communityId).populate({
      path: "roles",
      match: {
        isManagedByIndexer: true, // only can claim roles that are managed by indexer
        editable: true, // only can claim roles that are editable
      },
    });

    const address = await AccountAddress.findById(account.addresses[0]);

    const claimableRoles = [];
    await Promise.all(
      communityWithRoles.roles.map(async (role) => {
        const canClaim = await RoleService.canClaimRole(role, {
          address: address.address,
          account: account,
        });
        if (canClaim) {
          claimableRoles.push(role);
        }
      })
    );
    return claimableRoles;
  }
  /**
   * Create a list of AccountCommunityRole depending on the roles that can be claimed by the account
   * This require the account to be logged in
   * @param {Account} account
   * @param {ObjectId} communityId
   * @returns Promise<Role[]>
   */
  async claimRoles(account, { communityId }) {
    if (!account?._id || !communityId) return [];
    const claimableRoles = await this.refreshRoles(account, { communityId });
    const AccountCommunityService = new _AccountCommunityService();

    const accountCommunity = await AccountCommunity.findOne({
      account: account._id,
      community: communityId,
    });

    for (let role of claimableRoles) {
      await AccountCommunityService.createOrUpdateRoleForAccountCommunity(
        accountCommunity,
        {
          roleId: role._id,
          isManagedByIndexer: role.isManagedByIndexer,
        }
      );
    }

    return claimableRoles;
  }

  /**
   * Determine if an unauthenticated account can perform permission in a community
   * @param {ObjectId} communityId
   * @param {String} permissionIdentifier - [optional]the permission identifier to check
   * @param {String} permissionId - One of permissionId or permissionIdentifier is required
   * @param {String} channelId - [optional]the channel id for context
   * @returns Promise<Boolean>
   */
  async validPermissionForUnauthenticatedAccount(
    _,
    { communityId, permissionIdentifier, permissionId, channelId }
  ) {
    const defaultRole = await Role.findDefaultPublicRoleForCommunity({
      communityId,
    });

    // loop through roles and check if the account has the permission for any role
    const RoleService = new _RoleService();
    return RoleService.hasPermission(defaultRole, {
      permissionIdentifier,
      permissionId,
      channelId,
    });
  }
  /**
   * Determine if the account can perform permission in a community
   * @param {Account} account
   * @param {ObjectId} communityId
   * @param {String} permissionIdentifier - [optional]the permission identifier to check
   * @param {String} permissionId - One of permissionId or permissionIdentifier is required
   * @param {String} channelId - [optional]the channel id for context
   * @returns Promise<Boolean>
   */
  async validPermissionForAccount(
    account,
    { communityId, permissionIdentifier, permissionId, channelId },
    context
  ) {
    if (!communityId) return false;
    const getValidPermissionForEveryone = () => {
      return this.validPermissionForUnauthenticatedAccount(null, {
        communityId,
        permissionIdentifier,
        permissionId,
        channelId,
      });
    };
    // if not authenticated, check if the permission is valid for everyone
    if (!account?._id) return await getValidPermissionForEveryone();

    const accountCommunity = await AccountCommunity.findOrCreate({
      accountId: account._id,
      communityId: communityId,
    });
    // if account is not yet in the community, check if the permission is valid for everyone
    // if (!accountCommunity) return await getValidPermissionForEveryone();

    const AccountCommunityService = new _AccountCommunityService();

    const allowed =
      await AccountCommunityService.validPermissionForAccountCommunity(
        accountCommunity,
        {
          permissionIdentifier,
          permissionId,
          channelId,
        },
        context
      );

    return allowed;
  }
}

module.exports = { Service: AccountService };
