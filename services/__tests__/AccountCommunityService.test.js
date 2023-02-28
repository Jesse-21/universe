const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../../models/Account");
const { Community } = require("../../models/Community");
const { AccountCommunity } = require("../../models/AccountCommunity");

const {
  Service: _AccountCommunityService,
} = require("../AccountCommunityService");
const {
  Service: _InitializeCommunityService,
} = require("../initializer/InitializeCommunityService");
const { Service: _CommunityService } = require("../CommunityService");
const { Service: _RoleService } = require("../RoleService");

describe("AccountCommunityService tests", () => {
  let db;
  let AccountCommunityService;
  let CommunityService;
  let RoleService;
  let account;
  let accountCommunity;
  let role;
  let goodCommunity; // community that account can join
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
    goodCommunity = await Community.create({
      name: "Good community can join",
      owner: account._id,
    });
    accountCommunity = await AccountCommunity.create({
      account: account._id,
      community: goodCommunity._id,
      joined: false,
    });

    AccountCommunityService = new _AccountCommunityService();
    CommunityService = new _CommunityService();
    RoleService = new _RoleService();
    const InitializeCommunityService = new _InitializeCommunityService();

    const { roles, permissions } =
      await InitializeCommunityService.createDefaultRoleWithPermissions(
        goodCommunity
      );
    goodPermission = permissions[0];
    badPermission = permissions[1];
    publicRole = roles[0];

    role = await CommunityService.createRoleForCommunity(goodCommunity, {
      name: "role",
      isManagedByIndexer: true,
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("validPermissionForAccountCommunity", () => {
    it("should return true if account community has a valid role", async () => {
      // 1. grant role the permission
      await RoleService.updateRolePermissions(role, {
        permissionIds: [goodPermission._id],
      });

      // 2. grant role to account community
      const accountCommunityRole =
        await AccountCommunityService.createOrUpdateRoleForAccountCommunity(
          accountCommunity,
          {
            roleId: role._id,
            isManagedByIndexer: true,
          }
        );

      // 3. check if account community has a valid permission
      const hasPermission =
        await AccountCommunityService.validPermissionForAccountCommunity(
          accountCommunity,
          {
            permissionId: goodPermission._id,
          }
        );
      expect(hasPermission).toBe(true);

      // 4. check if account community does not have invalid permission
      const doesNotHavePermission =
        await AccountCommunityService.validPermissionForAccountCommunity(
          accountCommunity,
          {
            permissionId: badPermission._id,
          }
        );
      expect(doesNotHavePermission).toBe(false);

      // 5. if accountCommunityRole is not valid, should not have permission
      accountCommunityRole.isValid = false;
      await accountCommunityRole.save();
      const doesNotHavePermissionForInvalidRole =
        await AccountCommunityService.validPermissionForAccountCommunity(
          accountCommunity,
          {
            permissionId: goodPermission._id,
          }
        );
      expect(doesNotHavePermissionForInvalidRole).toBe(false);
    });
  });
});
