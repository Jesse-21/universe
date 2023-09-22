const axios = require("axios").default;
jest.mock("axios");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../../models/Account");
const { Community } = require("../../models/Community");
const { AccountCommunity } = require("../../models/AccountCommunity");

const {
  Service: _AccountCommunityService,
} = require("../AccountCommunityService");
const { Service: _CommunityService } = require("../CommunityService");
const { Service: _RoleService } = require("../RoleService");
const { Service: _AccountService } = require("../AccountService");
const {
  Service: _InitializeCommunityService,
} = require("../initializer/InitializeCommunityService");
const {
  Service: _ChannelMutationService,
} = require("../mutationServices/ChannelMutationService");

describe("AccountService tests", () => {
  let db;
  let AccountCommunityService;
  let ChannelMutationService;
  let CommunityService;
  let RoleService;
  let AccountService;
  let account;
  let accountCommunity;
  let role;
  let owner;
  let community; // community that account can join
  let publicRole; // role that is public
  let goodPermission; // READ
  let badPermission; // WRITE

  const mockAddress = getRandomAddress();
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });
    owner = await Account.createFromAddress({
      address: getRandomAddress(),
      chainId: mockChainId,
    });
    community = await Community.create({
      name: "Good community can join",
      owner: owner._id,
      bebdomain: "goodcommunitycanjoin",
    });
    accountCommunity = await AccountCommunity.create({
      account: account._id,
      community: community._id,
      joined: false,
    });

    AccountCommunityService = new _AccountCommunityService();
    ChannelMutationService = new _ChannelMutationService();
    CommunityService = new _CommunityService();
    RoleService = new _RoleService();
    AccountService = new _AccountService();
    const InitializeCommunityService = new _InitializeCommunityService();

    const { roles, permissions } =
      await InitializeCommunityService.createDefaultRoleWithPermissions(
        community
      );
    goodPermission = permissions[0];
    badPermission = permissions[1];
    publicRole = roles[0];

    role = await CommunityService.createRoleForCommunity(community, {
      name: "role",
      isManagedByIndexer: true,
      editable: true,
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("validPermissionForUnauthenticatedAccount", () => {
    it("should return true if an authenticated account has a public role with permission", async () => {
      // 1. grant role the permission
      await RoleService.updateRolePermissions(publicRole, {
        permissionIds: [goodPermission._id],
      });

      // 2. check if account has a valid permission
      const hasPermission =
        await AccountService.validPermissionForUnauthenticatedAccount(null, {
          permissionId: goodPermission._id,
          communityId: community._id,
        });
      expect(hasPermission).toBe(true);

      // 3. check if account community does not have invalid permission
      const doesNotHavePermission =
        await AccountService.validPermissionForUnauthenticatedAccount(null, {
          permissionId: badPermission._id,
          communityId: community._id,
        });
      expect(doesNotHavePermission).toBe(false);
    });
  });

  describe("validPermissionForAccount", () => {
    it("should return true if an authenticated account has a public role with permission", async () => {
      // 1. grant role the permission
      await RoleService.updateRolePermissions(publicRole, {
        permissionIds: [goodPermission._id],
      });

      // 2. check if account has a valid permission
      const hasPermission = await AccountService.validPermissionForAccount(
        null,
        {
          permissionId: goodPermission._id,
          communityId: community._id,
        }
      );
      expect(hasPermission).toBe(true);

      // 3. check if account does not have invalid permission
      const doesNotHavePermission =
        await AccountService.validPermissionForAccount(null, {
          permissionId: badPermission._id,
          communityId: community._id,
        });
      expect(doesNotHavePermission).toBe(false);
    });
    it("should return true if account has a valid role with permission", async () => {
      // 2. grant role the permission
      await RoleService.updateRolePermissions(role, {
        permissionIds: [goodPermission._id],
      });

      // 3. grant role to account community
      await AccountCommunityService.createOrUpdateRoleForAccountCommunity(
        accountCommunity,
        {
          roleId: role._id,
          isManagedByIndexer: true,
        }
      );

      // 4. check if account has a valid permission
      const hasPermission = await AccountService.validPermissionForAccount(
        account,
        {
          permissionId: goodPermission._id,
          communityId: community._id,
        }
      );
      expect(hasPermission).toBe(true);

      // 5. check if account community does not have invalid permission
      const doesNotHavePermission =
        await AccountService.validPermissionForAccount(account, {
          permissionId: badPermission._id,
          communityId: community._id,
        });
      expect(doesNotHavePermission).toBe(false);
    });
  });

  describe("refreshRoles", () => {
    it("should return empty array if community does not have valid roles to claim", async () => {
      const roles = await AccountService.refreshRoles(account, {
        communityId: community._id,
      }); // account has no roles with valid indexer rules

      expect(roles).toEqual([]);
    });

    it("should return no role if an account is not logged in", async () => {
      const roles = await AccountService.refreshRoles(null, {
        communityId: community._id,
      });
      expect(roles.length).toEqual(0);
    });

    it("should return all roles claimable by the account", async () => {
      // 1. account can claim the role since it is in the allowlist
      const allowlistRole = await CommunityService.createRoleForCommunity(
        community,
        {
          name: "allowlist role",
          isManagedByIndexer: true,
          editable: true,
        }
      );
      await RoleService.createIndexerRuleForRole(allowlistRole, {
        indexerRuleType: "ALLOWLIST",
        ruleData: {
          chainId: mockChainId,
          addresses: [mockAddress],
        },
      });

      // 2. account cannot claim the role since it does not have the correct NFT
      axios.get.mockResolvedValue({
        // mock non resolved value for Alchemy API
        data: {
          ownedNfts: [],
          success: true,
        },
      });
      const nftRole = await CommunityService.createRoleForCommunity(community, {
        name: "nftRole",
        isManagedByIndexer: true,
      });
      await RoleService.createIndexerRuleForRole(nftRole, {
        indexerRuleType: "NFT",
        ruleData: {
          address: getRandomAddress(),
          chainId: mockChainId,
          minAmount: 1,
        },
      });

      const roles = await AccountService.refreshRoles(account, {
        communityId: community._id,
      });

      expect(roles.length).toEqual(1); // allowlist roles
      expect(
        roles.find(
          (role) => role._id.toString() === allowlistRole._id.toString()
        )
      ).toBeDefined();
      expect(
        roles.find((role) => role._id.toString() === nftRole._id.toString())
      ).toBe(undefined);
    });
  });

  describe("claimRoles", () => {
    it("should return empty array if account is not defined", async () => {
      const roles = await AccountService.claimRoles(null, {
        communityId: community._id,
      });

      expect(roles).toEqual([]);
    });

    it("should return an array of account community roles", async () => {
      const roles = await AccountService.claimRoles(account, {
        communityId: community._id,
      });
      const claimableRoles = await AccountService.refreshRoles(account, {
        communityId: community._id,
      });

      expect(roles.length).toEqual(claimableRoles.length);
      expect(
        roles.find(
          (role) => role._id.toString() === claimableRoles[0]._id.toString()
        )
      ).toBeDefined();
    });

    it("should create AccountCommunityRole for claimable roles", async () => {
      await AccountService.claimRoles(account, {
        communityId: community._id,
      });
      const claimableRoles = await AccountService.refreshRoles(account, {
        communityId: community._id,
      });
      const accountCommunityWithRoles = await AccountCommunity.findById(
        accountCommunity._id
      ).populate("roles");

      expect(accountCommunityWithRoles.roles.length).toBeGreaterThanOrEqual(
        claimableRoles.length
      ); // account community can have more user-managed roles than claimable roles
      expect(
        accountCommunityWithRoles.roles.find(
          ({ role }) => role._id.toString() === claimableRoles[0]._id.toString()
        )
      ).toBeDefined();
    });
  });

  describe("getRoles", () => {
    it("should return empty array if account is not defined", async () => {
      const roles = await AccountService.getRoles(null);

      expect(roles).toEqual([]);
    });
    it("should return all valid roles claimed by the accout", async () => {
      const roles = await AccountService.getRoles(account);
      const accountCommunities = await AccountCommunity.find({
        account: account._id,
      });

      const promises = accountCommunities.map(async (accountCommunity) => {
        return await AccountCommunityService.getAccountCommunityRoles(
          accountCommunity,
          {
            includeDefault: true,
          }
        );
      });
      const accountCommunityRoles = await Promise.all(promises);
      const claimedRoles = accountCommunityRoles.reduce((acc, _roles) => {
        return acc.concat(_roles);
      });

      expect(roles.length).toEqual(claimedRoles.length);
      expect(
        roles.find(
          (role) => role._id.toString() === claimedRoles[0]._id.toString()
        )
      ).toBeDefined();
    });
  });

  describe("getChannelRecipientsByRolesAndAccount and getChannelRecipientsByRoles", () => {
    let accountChannel;
    let roleChannel;
    beforeAll(async () => {
      // 1. create a channel for account
      accountChannel =
        await ChannelMutationService.createChannelForCommunityOrUnauthorized(
          null,
          {
            channelInput: {
              name: "channel for account",
            },
            communityId: community._id,
            recipients: [`${mockAddress}@${community.bebdomain}.cast`],
          },
          { account: owner }
        );

      // 2. create a channel for account's roles
      const roles = await AccountService.getRoles(account);

      roleChannel =
        await ChannelMutationService.createChannelForCommunityOrUnauthorized(
          null,
          {
            channelInput: {
              name: "channel for role",
            },
            communityId: community._id,
            recipients: [`${roles[0].slug}@${community.bebdomain}.cast`],
          },
          { account: owner }
        );
    });
    describe("getChannelRecipientsByRolesAndAccount", () => {
      it("should return empty array if account is not defined", async () => {
        const channelsRecipients =
          await AccountService.getChannelRecipientsByRolesAndAccount(null);

        expect(channelsRecipients).toEqual([]);
      });
      it("should return all valid ChannelRecipients by the accout or the account's roles", async () => {
        const channelRecipients =
          await AccountService.getChannelRecipientsByRolesAndAccount(account, {
            limit: 10,
            offset: 0,
          });

        expect(channelRecipients.length).toEqual(2);
        expect(
          channelRecipients.find(
            (channelRecipient) =>
              channelRecipient.channel.toString() === roleChannel._id.toString()
          )
        ).toBeDefined();
        expect(
          channelRecipients.find(
            (channelRecipient) =>
              channelRecipient.channel.toString() ===
              accountChannel._id.toString()
          )
        ).toBeDefined();
      });
    });

    describe("getChannelsByRolesAndAccount", () => {
      it("should return empty array if account is not defined", async () => {
        const channels = await AccountService.getChannelsByRolesAndAccount(
          null
        );

        expect(channels).toEqual([]);
      });
      it("should return all valid Channels by the accout or the account's roles", async () => {
        await ChannelMutationService.createChannelForCommunityOrUnauthorized(
          null,
          {
            channelInput: {
              name: "invalid channel for account",
            },
            communityId: community._id,
            recipients: [`${getRandomAddress()}@${community.bebdomain}.cast`],
          },
          { account: owner }
        );

        const channels = await AccountService.getChannelsByRolesAndAccount(
          account,
          {
            limit: 10,
            offset: 0,
          }
        );

        expect(channels.length).toEqual(2);
        expect(
          channels.find(
            (channel) => channel._id.toString() === roleChannel._id.toString()
          )
        ).toBeDefined();
        expect(
          channels.find(
            (channel) =>
              channel._id.toString() === accountChannel._id.toString()
          )
        ).toBeDefined();
      });
    });
  });
});
