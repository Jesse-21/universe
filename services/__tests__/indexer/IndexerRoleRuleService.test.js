const mongoose = require("mongoose");
const axios = require("axios").default;
jest.mock("axios");

const { IndexerRuleService, CommunityService } = require("../../../services");
const {
  Service: _IndexerRoleRuleService,
} = require("../../../services/indexer/IndexerRoleRuleService");

const { Community } = require("../../../models/Community");

const { createDb } = require("../../../helpers/create-test-db");
const { getRandomAddress } = require("../../../helpers/get-random-address");

describe("IndexerRule Service tests", () => {
  let db;
  let community;
  let allowlistRole;
  let nftRole;
  let apiRole;
  let publicRole;
  let address;
  let IndexerRoleRuleService;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
    community = await Community.create({
      name: "Test community",
    });
    nftRole = await CommunityService.createRoleForCommunity(community, {
      name: "Test role",
      isManagedByIndexer: true,
    });

    allowlistRole = await CommunityService.createRoleForCommunity(community, {
      name: "Test allowlist role",
    });
    publicRole = await CommunityService.createRoleForCommunity(community, {
      name: "Test public role",
    });
    apiRole = await CommunityService.createRoleForCommunity(community, {
      name: "Test api role",
    });

    address = getRandomAddress();

    IndexerRoleRuleService = new _IndexerRoleRuleService();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_canClaimAllowlistRole", () => {
    it("should return true if address is in allowlist", async () => {
      const [indexerRule] = await IndexerRuleService.createRuleWithData({
        communityId: community._id,
        ruleOwnerType: 0,
        ruleOwnerId: allowlistRole._id,
        indexerRuleType: "ALLOWLIST",
        ruleData: {
          addresses: [address],
          chainId: 1,
        },
      });

      const result = await IndexerRoleRuleService._canClaimAllowlistRole(
        indexerRule,
        {
          data: {
            address,
          },
        }
      );
      expect(result).toBe(true);

      const badResult = await IndexerRoleRuleService._canClaimAllowlistRole(
        indexerRule,
        {
          data: {
            address: getRandomAddress(),
          },
        }
      );
      expect(badResult).toBe(false);
    });
  });

  describe("_canClaimNFTRole", () => {
    it("should return true if address has the NFT", async () => {
      expect.assertions(2);

      const [indexerRule] = await IndexerRuleService.createRuleWithData({
        communityId: community._id,
        ruleOwnerType: 0,
        ruleOwnerId: nftRole._id,
        indexerRuleType: "NFT",
        ruleData: {
          address,
          chainId: 1,
        },
      });

      // mock resolved value for Alchemy API
      axios.get.mockResolvedValue({
        data: {
          ownedNfts: [address],
          success: true,
        },
      });

      const result = await IndexerRoleRuleService._canClaimNFTRole(
        indexerRule,
        {
          data: {
            address,
          },
        }
      );
      expect(result).toBe(true);

      // mock non resolved value for Alchemy API
      axios.get.mockResolvedValue({
        data: {
          ownedNfts: [],
          success: true,
        },
      });
      const badResult = await IndexerRoleRuleService._canClaimNFTRole(
        indexerRule,
        {
          data: {
            address,
          },
        }
      );
      expect(badResult).toBe(false);
    });
  });

  describe("_canClaimAPIRole", () => {
    it("should return true if API returns { success: true }", async () => {
      expect.assertions(2);

      const [indexerRule] = await IndexerRuleService.createRuleWithData({
        communityId: community._id,
        ruleOwnerType: 0,
        ruleOwnerId: apiRole._id,
        indexerRuleType: "API",
        ruleData: {
          uri: "https://api.test.com/isOwner",
        },
      });

      // mock resolved value for https://api.test.com/isOwner API
      axios.get.mockResolvedValue({
        data: {
          success: true,
        },
      });

      const result = await IndexerRoleRuleService._canClaimAPIRole(
        indexerRule,
        {
          data: {
            address,
          },
        }
      );
      expect(result).toBe(true);

      // mock non resolved value for Alchemy API
      axios.get.mockResolvedValue({
        data: {
          success: false,
        },
      });
      const badResult = await IndexerRoleRuleService._canClaimAPIRole(
        indexerRule,
        {
          data: {
            address,
          },
        }
      );
      expect(badResult).toBe(false);
    });
  });

  describe("canClaimRole", () => {
    it("should return true for PUBLIC role", async () => {
      const [indexerRule] = await IndexerRuleService.createRuleWithData({
        communityId: community._id,
        ruleOwnerType: 0,
        ruleOwnerId: publicRole._id,
        indexerRuleType: "PUBLIC",
      });

      const result = await IndexerRoleRuleService.canClaimRole(indexerRule, {
        roleId: publicRole._id,
        data: {},
      });
      expect(result).toBe(true);
    });
  });
});
