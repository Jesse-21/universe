const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../../models/Account");
const { Community } = require("../../models/Community");
const { Role } = require("../../models/Role");
const { Channel } = require("../../models/Channel");
const { IndexerRule } = require("../../models/IndexerRule");
const { AccountCommunity } = require("../../models/AccountCommunity");

const { Service: _PermissionService } = require("../PermissionService");
const { Service: _CommunityService } = require("../CommunityService");
const {
  Service: _AccountCommunityService,
} = require("../AccountCommunityService");
const { Service: _ChannelService } = require("../ChannelService");
const { Service: _RoleService } = require("../RoleService");
const { Service: _IndexerRuleService } = require("../IndexerRuleService");
const { default: mongoose } = require("mongoose");

describe("RoleService tests", () => {
  let db;
  let PermissionService;
  let CommunityService;
  let IndexerRuleService;

  let AccountCommunityService;
  let RoleService;
  let role;
  let permission1; // read, bitwise position 0
  let permission2; // write, bitwise position 0
  let community;
  let account;
  let accountCommunity;
  const mockAddress = getRandomAddress();
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    community = await Community.create({
      name: "community",
    });
    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });
    accountCommunity = await AccountCommunity.create({
      account: account._id,
      community: community._id,
      joined: false,
    });

    PermissionService = new _PermissionService();
    CommunityService = new _CommunityService();

    RoleService = new _RoleService();
    IndexerRuleService = new _IndexerRuleService();
    AccountCommunityService = new _AccountCommunityService();

    role = await CommunityService.createRoleForCommunity(community, {
      name: "role",
      isManagedByIndexer: true,
    });
    permission1 = await CommunityService.createPermissionForCommunity(
      community,
      {
        name: "read",
        uniqueIdentifier: "read",
        editable: false,
      }
    );

    permission2 = await CommunityService.createPermissionForCommunity(
      community,
      {
        name: "write",
        uniqueIdentifier: "write",
        editable: false,
      }
    );
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("updateRolePermissions", () => {
    it("should update the role's permissionString depending on an array of permission Ids", async () => {
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [permission1._id, permission2._id],
      });
      const permissionString =
        await PermissionService.generatePermissionStringFromIds([
          permission1._id,
          permission2._id,
        ]);
      expect(updatedRole.permissionString).toBe(permissionString);
    });

    it("should update permission string to null if no permission ids provided", async () => {
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [],
      });
      expect(updatedRole.permissionString).toBe(null);
    });
  });

  describe("getRoleBasePermissionArray", () => {
    it("should return an array of permission matching the role's permissionString", async () => {
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [permission1._id, permission2._id],
      });
      const permissions = await RoleService.getRoleBasePermissionArray(
        updatedRole
      );
      expect(permissions[0]._id.toString()).toBe(permission1._id.toString());
      expect(permissions[1]._id.toString()).toBe(permission2._id.toString());
    });

    it("should return empty array if role permission string is null", async () => {
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [],
      });
      const permissions = await RoleService.getRoleBasePermissionArray(
        updatedRole
      );
      expect(permissions.length).toBe(0);
    });
  });

  describe("hasPermission", () => {
    let channel;
    beforeAll(async () => {
      // 1. create an empty channel
      channel = await CommunityService.createChannelForCommunity(community, {
        name: "channel",
      });
    });
    afterAll(async () => {
      // 1. delete the channel
      await Channel.deleteOne({ _id: channel._id });
    });
    it("should return true if a role has a permission", async () => {
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [permission1._id, permission2._id],
      });
      const hasPermission1 = await RoleService.hasPermission(updatedRole, {
        permissionId: permission1._id,
      });
      const hasPermission2 = await RoleService.hasPermission(updatedRole, {
        permissionId: permission2._id,
      });
      expect(hasPermission1).toBe(true);
      expect(hasPermission2).toBe(true);
    });

    it("should return false if a role does not have the permission", async () => {
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [], // set role permission to none
      });
      const hasPermission1 = await RoleService.hasPermission(updatedRole, {
        permissionId: permission1._id,
      });
      expect(hasPermission1).toBe(false);
    });

    it("should work with channel permission overwrites", async () => {
      // 1. create a permission overwrite for the channel for permission1
      const ChannelService = new _ChannelService();
      await ChannelService.createPermissionOverwriteForChannel(channel, {
        objectType: "ROLE",
        objectTypeId: role._id,
        permissionIds: [permission1._id],
      });

      // 2. update the role to have no base permission
      const updatedRole = await RoleService.updateRolePermissions(role, {
        permissionIds: [],
      });

      // 3. check if the role has the permission from the channel permission overwrite
      const hasPermission1 = await RoleService.hasPermission(updatedRole, {
        permissionId: permission1._id,
        channelId: channel._id,
      });
      expect(hasPermission1).toBe(true);

      // 4. should not permissions not set in the channel permission overwrite
      const hasPermission2 = await RoleService.hasPermission(updatedRole, {
        permissionId: permission2._id,
        channelId: channel._id,
      });
      expect(hasPermission2).toBe(false);
    });
  });

  describe("computePermissionOverwrite", () => {
    let channel;
    beforeAll(async () => {
      // 1. create an empty channel
      channel = await CommunityService.createChannelForCommunity(community, {
        name: "channel",
      });
    });
    afterAll(async () => {
      // 1. delete the channel
      await Channel.deleteOne({ _id: channel._id });
    });

    it("should return base permission if channel is not found", async () => {
      const roles = [role];
      const permission = await RoleService.computePermissionOverwrite(
        roles,
        {
          channelId: new mongoose.Types.ObjectId(),
          basePermission: "1",
        },
        {
          account,
        }
      );
      expect(permission).toBe("1");
    });

    it("should work with channel permission overwrites", async () => {
      // 1. create a permission overwrite for the channel for permission1
      const ChannelService = new _ChannelService();
      await ChannelService.createPermissionOverwriteForChannel(channel, {
        objectType: "ROLE",
        objectTypeId: role._id,
        permissionIds: [permission1._id],
      });
      // 2. Compute the permission overwrite with allowed permission1
      const roles = [role];
      const p = await RoleService.computePermissionOverwrite(
        roles,
        {
          channelId: channel._id,
          basePermission: "0",
        },
        {
          account,
        }
      );
      expect(p).toBe(permission1.bitwiseFlag);
      // 3. Should not override base permission
      const basePermission = PermissionService.combinePermissionStrings([
        permission1.bitwiseFlag,
        permission2.bitwiseFlag,
      ]);

      const p2 = await RoleService.computePermissionOverwrite(
        roles,
        {
          channelId: channel._id,
          basePermission,
        },
        {
          account,
        }
      );
      expect(p2).toBe(basePermission);

      // 4. Compute the permission overwrite with denied permission2 (should be only permission1)
      await ChannelService.createPermissionOverwriteForChannel(channel, {
        objectType: "ROLE",
        objectTypeId: role._id,
        deniedPermissionIds: [permission2._id],
      });
      const p3 = await RoleService.computePermissionOverwrite(
        roles,
        {
          channelId: channel._id,
          basePermission,
        },
        {
          account,
        }
      );
      expect(p3).toBe(permission1.bitwiseFlag);

      // 4. Compute the permission overwrite with account permissionOverwrites
      // this will override the role permission overwrites
      await ChannelService.createPermissionOverwriteForChannel(channel, {
        objectType: "USER",
        objectTypeId: account._id,
        permissionIds: [permission2._id], // implicitly allow previously denied permission2
      });
      const p4 = await RoleService.computePermissionOverwrite(
        roles,
        {
          channelId: channel._id,
          basePermission,
        },
        {
          account,
        }
      );
      expect(p4).toBe(basePermission);
    });
  });

  describe("deleteIndexerRuleForRole", () => {
    it("should delete an indexerRule from a role's indexerRules array", async () => {
      const indexerRule = await RoleService.createIndexerRuleForRole(role, {
        indexerRuleType: "NFT",
        ruleData: {
          address: "0x0000000000000000000000000000000000000000",
          chainId: 1,
          minAmount: 1,
        },
      });
      const refreshedRoleAfterCreate = await Role.findById(role._id);
      expect(refreshedRoleAfterCreate.indexerRules.length).toBeDefined();

      await RoleService.deleteIndexerRuleForRole(role, {
        indexerRuleId: indexerRule._id,
      });
      const DeletedindexerRule = await IndexerRule.findById(indexerRule._id);
      const deletedIndexerRuleData = await IndexerRuleService.getRuleData(
        indexerRule
      );
      const refreshedRoleAfterDelete = await Role.findById(role._id);
      expect(refreshedRoleAfterDelete.indexerRules.length).toBe(0);
      expect(DeletedindexerRule).toBeNull();
      expect(deletedIndexerRuleData).toBeNull();
    });
  });
});
