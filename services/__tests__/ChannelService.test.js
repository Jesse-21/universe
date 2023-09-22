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
const { Service: _ChannelService } = require("../ChannelService");

describe("ChannelService tests", () => {
  let db;
  let AccountCommunityService;
  let CommunityService;
  let ChannelService;

  let account; // creator of channel, can read and write channel
  let recipient; // recipient of channel, can read and write channel
  let publicAccountNoPermission; // account that has no permission to read or write channel
  let accountCommunity;
  let publicAccountCommunity;
  let recipientAccountCommunity;

  let goodCommunity; // community that account can join
  let channel; // channel that is not public, but account can read and write

  let readPermission; // READ
  let writePermission; // WRITE

  const mockAddress = getRandomAddress();
  const publicAddress = getRandomAddress();
  const recipientAddress = getRandomAddress();
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });
    recipient = await Account.createFromAddress({
      address: recipientAddress,
      chainId: mockChainId,
    });
    publicAccountNoPermission = await Account.createFromAddress({
      address: publicAddress,
      chainId: mockChainId,
    });

    goodCommunity = await Community.create({
      name: "Good community",
      owner: account._id,
    });

    accountCommunity = await AccountCommunity.create({
      account: account._id,
      community: goodCommunity._id,
    });
    publicAccountCommunity = await AccountCommunity.create({
      account: publicAccountNoPermission._id,
      community: goodCommunity._id,
    });
    recipientAccountCommunity = await AccountCommunity.create({
      account: recipient._id,
      community: goodCommunity._id,
    });

    AccountCommunityService = new _AccountCommunityService();
    CommunityService = new _CommunityService();
    ChannelService = new _ChannelService();
    const InitializeCommunityService = new _InitializeCommunityService();

    const { permissions } =
      await InitializeCommunityService.createDefaultRoleWithPermissions(
        goodCommunity
      );
    readPermission = permissions[0];
    writePermission = permissions[1];

    channel = await CommunityService.createChannelForCommunity(
      goodCommunity,
      {
        name: "channel",
        recipients: [
          {
            recipientId: recipient._id,
            recipientType: 0,
            slug: `${recipientAddress}@${goodCommunity.bebdomain}.cast`,
          },
        ],
      },
      {
        account, // account is the creator of the channel
      }
    );
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("createPermissionOverwritesForChannelRecipients", () => {
    it("should return true if account community has a valid role", async () => {
      // 1. get all community permissions strings
      const allPermissionStrings =
        await CommunityService.getCommunityAllPermissionString(goodCommunity);

      // 2. create permission overwrites for channel recipients
      await ChannelService.createPermissionOverwritesForChannelRecipients(
        channel,
        {
          allowedPermissionString: allPermissionStrings, // allow all permissions to only recipients
          deniedPermissionString: allPermissionStrings, // deny all permissions to public
        }
      );

      // 3. check if account community and recipients have a valid permission
      const hasPermission =
        await AccountCommunityService.validPermissionForAccountCommunity(
          accountCommunity,
          {
            permissionId: readPermission._id,
            channelId: channel._id,
          },
          {
            account: account, // need to pass context to compute permission overwrite for account
          }
        );
      expect(hasPermission).toBe(true);

      const recipientHasPermission =
        await AccountCommunityService.validPermissionForAccountCommunity(
          recipientAccountCommunity,
          {
            permissionId: writePermission._id,
            channelId: channel._id,
          },
          {
            account: recipient, // need to pass context to compute permission overwrite for account
          }
        );
      expect(recipientHasPermission).toBe(true);

      // 4. check if public account does not have invalid permission
      const doesNotHavePermission =
        await AccountCommunityService.validPermissionForAccountCommunity(
          publicAccountCommunity,
          {
            permissionId: writePermission._id,
            channelId: channel._id,
          },
          {
            account: publicAccountNoPermission, // need to pass context to compute permission overwrite for account
          }
        );
      expect(doesNotHavePermission).toBe(false);
    });
  });
});
