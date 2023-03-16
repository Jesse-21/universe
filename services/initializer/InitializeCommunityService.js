const { Service: _CommunityService } = require("../CommunityService");
const { Service: _RoleService } = require("../RoleService");
const {
  Service: _AccountCommunityService,
} = require("../AccountCommunityService");
const {
  Service: _InitializeAccountCommunityService,
} = require("./InitializeAccountCommunityService");

class InitializeCommunityService {
  /**
   * Create default read and write permissions for community
   * @returns {Promise<Permission[]>}
   */
  async createDefaultReadWritePermissions(community) {
    if (!community) throw new Error("Invalid community");

    const CommunityService = new _CommunityService();
    const readPermission = await CommunityService.createPermissionForCommunity(
      community,
      {
        name: "read",
        uniqueIdentifier: "READ",
        editable: false,
        description: {
          raw: "Allows viewing content",
        },
      }
    );

    const writePermission = await CommunityService.createPermissionForCommunity(
      community,
      {
        name: "write",
        uniqueIdentifier: "WRITE",
        editable: false,
        description: {
          raw: "Allows publishing content",
        },
      }
    );
    return [readPermission, writePermission];
  }

  /**
   * Create default admin and public roles for a community
   * @returns {Promise<Role[]>}
   */
  async createDefaultPublicAndOwnerRoles(community) {
    if (!community) throw new Error("Invalid community");

    const CommunityService = new _CommunityService();
    const publicRole = await CommunityService.createRoleForCommunity(
      community,
      {
        name: "public",
        isManagedByIndexer: true,
        editable: false,
        description: {
          raw: "The default role for all users, all permissions by default",
        },
      }
    );
    // create a indexer rule for the public role to be managedb by the indexer
    const RoleService = new _RoleService();
    await RoleService.createIndexerRuleForRole(publicRole, {
      indexerRuleType: "PUBLIC",
    });

    const ownerRole = await CommunityService.createRoleForCommunity(community, {
      name: "owner",
      isManagedByIndexer: false,
      editable: false,
      description: {
        raw: "The default owner role with all permissions",
      },
    });
    return [publicRole, ownerRole];
  }

  /**
   * Create an account community for the owner and assign the owner role to the account
   * @returns {Promise<AccountCommunity>}
   */
  async createAccountCommunityForOwner({ community, ownerRoleId }) {
    if (!community?.owner)
      throw new Error("Invalid community or community owner");
    if (!ownerRoleId) throw new Error("Invalid owner role id");

    // create an account community for the owner
    const InitializeAccountCommunityService =
      new _InitializeAccountCommunityService();
    const accountCommunity = await InitializeAccountCommunityService.initialize(
      null,
      {
        communityId: community._id,
        joined: true,
      },
      {
        accountId: community.owner,
      }
    );

    // assign the owner role to the account community
    const AccountCommunityService = new _AccountCommunityService();
    await AccountCommunityService.createOrUpdateRoleForAccountCommunity(
      accountCommunity,
      {
        roleId: ownerRoleId,
        isManagedByIndexer: false,
      }
    );
    return accountCommunity;
  }

  /**
   * Grant the owner role with read and write access to the community, and the public role with read and write access as well
   * @returns {Promise<null>}
   */
  async grantDefaultPermissionsToPublicAndOwner({
    community,
    publicRole,
    ownerRole,
    readPermission,
    writePermission,
  }) {
    if (!community) throw new Error("Invalid community");
    if (!publicRole || !ownerRole) throw new Error("Invalid roles");
    if (!readPermission || !writePermission)
      throw new Error("Invalid permissions");
    const RoleService = new _RoleService();

    await RoleService.updateRolePermissions(publicRole, {
      permissionIds: [readPermission._id, writePermission._id],
    });
    await RoleService.updateRolePermissions(ownerRole, {
      permissionIds: [readPermission._id, writePermission._id],
    });
    return null;
  }

  /**
   * Create default read and write permissions for community
   * Create default iwber and public roles for a community
   * Then assign the iwber role with read and write access, and the public role with no access
   * @returns {Promise<{ role: Role[], permissions: Permission[]}>} - publicRole[0] and ownerRole[1] - readPermission[0] and writePermission[1]
   */
  async createDefaultRoleWithPermissions(community) {
    if (!community) throw new Error("Invalid community");

    // 1. create read and write permissions for community
    const [readPermission, writePermission] =
      await this.createDefaultReadWritePermissions(community);
    // 2. create default public and owner roles for the community
    const [publicRole, ownerRole] = await this.createDefaultPublicAndOwnerRoles(
      community
    );
    // 3. grant the owner role with read and write access to the community, and the public role with no access
    await this.grantDefaultPermissionsToPublicAndOwner({
      community,
      publicRole,
      ownerRole,
      readPermission,
      writePermission,
    });
    // 4. create an account community for the owner and assign the owner role to the account
    await this.createAccountCommunityForOwner({
      community,
      ownerRoleId: ownerRole._id,
    });
    return {
      roles: [publicRole, ownerRole],
      permissions: [readPermission, writePermission],
    };
  }
}

module.exports = { Service: InitializeCommunityService };
