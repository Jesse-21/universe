const { Service: PermissionService } = require("./PermissionService");
const { Service: ChannelService } = require("./ChannelService");
const { Permission } = require("../models/Permission");
const { Channel } = require("../models/Channel");

const { Service: _IndexerRuleService } = require("./IndexerRuleService");

class RoleService {
  /**
   * create a IndexerRule for an existing Role, and insert into the role's indexerRules array
   * @param {Role} role
   * @param {string} indexerRuleType SALES | NFT | PUBLIC | ALLOWLIST | API ...
   * @param {Object} ruleData data to create the IndexerRule for
   * @returns {Promise<IndexerRule>}
   */
  async createIndexerRuleForRole(role, { indexerRuleType, ruleData = {} }) {
    if (!role) throw new Error("Invalid role");
    const IndexerRuleService = new _IndexerRuleService();

    const [indexerRule] = await IndexerRuleService.createRuleWithData({
      indexerRuleType,
      ruleData,
      communityId: role.community,
      ruleOwnerType: 0, // role
      ruleOwnerId: role._id,
    });
    role.indexerRules.push(indexerRule);
    await role.save();
    return indexerRule;
  }
  /**
   * delete a IndexerRule and remove it from an existing Role's indexerRules array
   * @param {Role} role
   * @param {ObjectId} indexerRuleId
   * @returns {Promise<ObjectId>} - deleted indexerRuleId
   */
  async deleteIndexerRuleForRole(role, { indexerRuleId }) {
    if (!role || !indexerRuleId)
      throw new Error("Invalid role or indexer rule");
    const IndexerRuleService = new _IndexerRuleService();

    const deletedIndexerRuleId = await IndexerRuleService.deleteRule(
      indexerRuleId
    );
    role.indexerRules = role.indexerRules.filter(
      (indexerRule) =>
        indexerRule._id.toString() !== deletedIndexerRuleId.toString()
    );
    await role.save();
    return deletedIndexerRuleId;
  }
  /**
   * Determine if a role can be claimed according to data and its indexer rule
   * @param {Role} role
   * @param {Object} data - { address: String } data to pass the indexer rule
   * @returns {Promise<boolean>}
   */
  async canClaimRole(role, data = {}) {
    if (!role?._id) throw new Error("Invalid role");
    if (!role.isManagedByIndexer) return false; // not managed by indexer
    const roleWithIndexerRules = await role.populate("indexerRules");
    const indexerRule = roleWithIndexerRules.indexerRules?.[0];
    if (!indexerRule) return false;

    const IndexerRuleService = new _IndexerRuleService();
    switch (indexerRule.indexerRuleType) {
      case "NFT":
        return IndexerRuleService.canClaimRole(indexerRule, {
          data: { address: data.address },
        });
      case "ALLOWLIST":
        return IndexerRuleService.canClaimRole(indexerRule, {
          data: {
            address: data.address,
          },
        });
      case "FARCASTER":
        return IndexerRuleService.canClaimRole(indexerRule, {
          data: {
            account: data.account,
            address: data.address,
          },
        });
      case "API":
        return IndexerRuleService.canClaimRole(indexerRule, {
          data: {
            address: data.address,
          },
        });
      case "PUBLIC":
        return IndexerRuleService.canClaimRole(indexerRule, {
          data,
        });
      default:
        return false;
    }
  }

  /**
   * Generate a permission string from an array of permission ids and update the role's permissionString
   * @param {Role} role
   * @param {ObjectIds[]} permissionIds
   * @returns {Promise<Role>}
   */
  async updateRolePermissions(role, { permissionIds }) {
    if (!role?._id) throw new Error("Invalid role");
    const _PermissionService = new PermissionService();
    const permissionString =
      await _PermissionService.generatePermissionStringFromIds(permissionIds);
    role.permissionString = permissionString;
    return role.save();
  }

  /**
   * Get base role permission array in community, not account channel's permission overwrite
   * @param {Role} role
   * @returns {Promise<Permission[]>} - deserialized permissions
   */
  async getRoleBasePermissionArray(role) {
    if (!role?._id || !role?.community) throw new Error("Invalid role");

    const _PermissionService = new PermissionService();

    const permissions = await Permission.find({ community: role.community });

    let allowedPermissions = permissions.filter((permission) => {
      const isSet = _PermissionService.isFlagSetForPermissionString(
        role.permissionString,
        permission.bitwiseFlag
      );
      return isSet;
    });

    return allowedPermissions;
  }

  /**
   * Determine the role's Permission Overwrite in a specified channel
   * @param {Role} role
   * @returns {Promise<PermissionOverwrite>}
   */
  async getRolePermissionOverwrite(role, { channelId }) {
    if (!role?._id || !role?.community) throw new Error("Invalid role");
    const channel = await Channel.findById(channelId);
    if (!channel) return false;

    const _ChannelService = new ChannelService();
    const permissionOverwrite =
      await _ChannelService.getPermissionOverwriteForChannel(channel, {
        objectType: 1, // role
        objectTypeId: role._id,
      });
    return permissionOverwrite;
  }

  /**
   * Get if role has Permission(identified by permissionId or uniqueIdentifier), optionally check for channel permission overwrite
   * @param {Role} role
   * @returns {Promise<Boolean>} - true if role has permission
   */
  async hasPermission(role, { permissionIdentifier, permissionId, channelId }) {
    if (!role?._id || !role?.community) throw new Error("Invalid role");

    // 1. find permission
    const permission = await Permission.findByUniqueIdentifierOrId({
      uniqueIdentifier: permissionIdentifier,
      permissionId,
      communityId: role.community,
    });
    if (!permission) return false;

    // 2. check if role has a permission overwrite in channel
    let permissionOverwrite = null;
    if (channelId) {
      permissionOverwrite = await this.getRolePermissionOverwrite(role, {
        channelId,
      });
    }

    // 3. if role has permission overwrite, use that, otherwise use role's permissionString
    const finalPermissionString = permissionOverwrite
      ? permissionOverwrite.allowedPermissionString
      : role.permissionString;

    const _PermissionService = new PermissionService();

    const isSet = _PermissionService.isFlagSetForPermissionString(
      finalPermissionString,
      permission.bitwiseFlag
    );

    return isSet;
  }

  /**
   * compute combined base permission string for roles
   * @param {Role[]} roles
   * @returns {Promise<String>} - the base permission string
   */
  computeBasePermissions(roles = []) {
    const _PermissionService = new PermissionService();

    const permissionString = _PermissionService.combinePermissionStrings(
      roles.map((role) => role.permissionString)
    );
    return permissionString;
  }

  /**
   * compute combined permission overwrite string for roles
   * @param {Role[]} roles
   * @returns {Promise<String>} - the base permission string
   */
  async computePermissionOverwrite(
    roles = [],
    { channelId, basePermission },
    context = {}
  ) {
    let allow = null;
    let deny = null;
    let finalPermissionString = basePermission;
    if (!channelId) return finalPermissionString;

    const _ChannelService = new ChannelService();
    const channel = await Channel.findById(channelId);
    const permissionOverwrites =
      await _ChannelService.geChannelPermissionOverwrites(channel);
    if (!permissionOverwrites?.length) return finalPermissionString;

    // 1. get all permission overwrites for roles
    const hm = {};
    roles.forEach((role) => {
      hm[role._id] = role;
    });
    permissionOverwrites.forEach((permissionOverwrite) => {
      if (
        permissionOverwrite.objectType === 1 &&
        hm[permissionOverwrite.objectTypeId]
      ) {
        // role
        allow |= permissionOverwrite.allowedPermissionString;
        deny |= permissionOverwrite.deniedPermissionString;
      }
    });

    // 2. compute permission string
    finalPermissionString &= ~deny;
    finalPermissionString |= allow;

    // 3. apply user permission overwrite if applicable
    const userPermissionOverwrite = permissionOverwrites.find((p) => {
      return (
        p.objectType === 0 &&
        p.objectTypeId?.equals?.(context.account?._id || context.accountId)
      );
    });

    if (userPermissionOverwrite) {
      finalPermissionString &= ~userPermissionOverwrite.deniedPermissionString;
      finalPermissionString |= userPermissionOverwrite.allowedPermissionString;
    }

    return `${finalPermissionString}`;
  }

  /**
   * Get if one of the roles can perform Permission
   * @param {Role[]} roles
   * @returns {Promise<Boolean>} - true if one of the role has permission
   */
  async hasPermissionForRoles(
    roles = [],
    { permissionIdentifier, permissionId, channelId },
    context
  ) {
    if (!roles?.length) return false;
    // 1. compute base permission string for roles
    const basePermission = this.computeBasePermissions(roles);

    // 2. compute permission overwrite check
    const finalPermission = await this.computePermissionOverwrite(
      roles,
      { channelId, basePermission },
      context
    );

    // 3. find permission
    const permission = await Permission.findByUniqueIdentifierOrId({
      uniqueIdentifier: permissionIdentifier,
      permissionId,
      communityId: roles[0].community, // all roles must be in the same community
    });
    if (!permission) return false;
    // 4. check if base permission has permission
    const _PermissionService = new PermissionService();

    const isSet = _PermissionService.isFlagSetForPermissionString(
      finalPermission,
      permission.bitwiseFlag
    );

    return isSet;
  }
}

module.exports = { Service: RoleService };
