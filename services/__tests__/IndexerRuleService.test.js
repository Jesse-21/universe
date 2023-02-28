const mongoose = require("mongoose");

const { IndexerRuleService, CommunityService } = require("../../services");

const { Community } = require("../../models/Community");
const { IndexerRule } = require("../../models/IndexerRule");
const { IndexerRuleNFT } = require("../../models/IndexerRuleNFT");
const { IndexerRuleAllowlist } = require("../../models/IndexerRuleAllowlist");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

describe("IndexerRule Service tests", () => {
  let db;
  let community;
  let channel;
  let role;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
    community = await Community.create({
      name: "Test community",
    });
    channel = await CommunityService.createChannelForCommunity(community, {
      name: "Test channel",
    });
    role = await CommunityService.createRoleForCommunity(community, {
      name: "Test role",
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_beforeCreateRuleCheck", () => {
    it("should return error if required params are missing", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({});
      } catch (e) {
        expect(e.message).toEqual("Missing required parameters");
      }
    });
    it("should return error if invalid rule owner type", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: community._id,
          ruleOwnerType: 3,
          ruleOwnerId: channel._id,
          indexerRuleType: "SALES",
        });
      } catch (e) {
        expect(e.message).toEqual(
          "Only role(0), channel(1) and rich blocks(2) are supported"
        );
      }
    });
    it("should return error if invalid indexerRuleType for channel", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: community._id,
          ruleOwnerType: 1,
          ruleOwnerId: channel._id,
          indexerRuleType: "NFT", // channel does not support NFT
        });
      } catch (e) {
        expect(e.message).toEqual(
          "Invalid indexerRuleType for channel(1): NFT"
        );
      }
    });
    it("should return error if invalid indexerRuleType for role", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: community._id,
          ruleOwnerType: 0,
          ruleOwnerId: role._id,
          indexerRuleType: "SALES", // role does not support SALES
        });
      } catch (e) {
        expect(e.message).toEqual("Invalid indexerRuleType for role(0): SALES");
      }
    });

    it("should return error if channel does not exist", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: community._id,
          ruleOwnerType: 1,
          ruleOwnerId: mongoose.Types.ObjectId(),
          indexerRuleType: "SALES",
        });
      } catch (e) {
        expect(e.message).toEqual("Channel does not exist");
      }
    });

    it("should return error if role does not exist", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService._beforeCreateRuleCheck({
          communityId: community._id,
          ruleOwnerType: 0,
          ruleOwnerId: mongoose.Types.ObjectId(),
          indexerRuleType: "NFT",
        });
      } catch (e) {
        expect(e.message).toEqual("Role does not exist");
      }
    });

    it("should return true if all conditions are satisfied for role", async () => {
      expect.assertions(1);
      const res = await IndexerRuleService._beforeCreateRuleCheck({
        communityId: community._id,
        ruleOwnerType: 0,
        ruleOwnerId: role._id,
        indexerRuleType: "NFT",
      });
      expect(res).toBe(true);
    });

    it("should return true if all conditions are satisfied for channel", async () => {
      expect.assertions(1);
      const res = await IndexerRuleService._beforeCreateRuleCheck({
        communityId: community._id,
        ruleOwnerType: 1,
        ruleOwnerId: channel._id,
        indexerRuleType: "SALES",
      });
      expect(res).toBe(true);
    });
  });

  describe("createRuleWithData", () => {
    beforeEach(async () => {
      await IndexerRuleNFT.deleteMany();
      await IndexerRuleAllowlist.deleteMany();
      await IndexerRule.deleteMany();
    });
    it("should call _beforeCreateRuleCheck", async () => {
      expect.assertions(1);
      const spy = jest.spyOn(IndexerRuleService, "_beforeCreateRuleCheck");
      await IndexerRuleService.createRuleWithData({
        communityId: community._id,
        ruleOwnerType: 0,
        ruleOwnerId: role._id,
        indexerRuleType: "NFT",
        ruleData: {
          address: getRandomAddress(),
          chainId: 1,
        },
      });
      expect(spy).toHaveBeenCalled();
    });

    it("should throw an error if ruleData is missing required params", async () => {
      expect.assertions(1);
      try {
        await IndexerRuleService.createRuleWithData({
          communityId: community._id,
          ruleOwnerType: 0,
          ruleOwnerId: role._id,
          indexerRuleType: "NFT",
          ruleData: {
            address: getRandomAddress(),
          },
        });
      } catch (e) {
        expect(e.message).toEqual("Error creating rule: Invalid chain id");
      }
    });

    it("should create an IndexerRuleNFT with an IndexerRule for rule type NFT", async () => {
      const address = getRandomAddress();
      const [indexerRule, nftRuleData] =
        await IndexerRuleService.createRuleWithData({
          communityId: community._id,
          ruleOwnerType: 0,
          ruleOwnerId: role._id,
          indexerRuleType: "NFT",
          ruleData: {
            address,
            chainId: 1,
          },
        });
      expect(indexerRule).toBeDefined();
      const found = await IndexerRuleNFT.findOne({
        indexerRuleId: indexerRule._id,
      });

      await found.populate("address");

      expect(found._id.toString()).toEqual(nftRuleData._id.toString());
      expect(found.address.address).toEqual(address);
      expect(indexerRule.ruleOwnerId.toString()).toEqual(role._id.toString());
      expect(indexerRule.ruleDataId.toString()).toEqual(found._id.toString());
    });

    it("should create an IndexerRuleAllowlist with an IndexerRule for rule type ALLOWLIST", async () => {
      const address = getRandomAddress();
      const [indexerRule, allowlistRuleData] =
        await IndexerRuleService.createRuleWithData({
          communityId: community._id,
          ruleOwnerType: 0,
          ruleOwnerId: role._id,
          indexerRuleType: "ALLOWLIST",
          ruleData: {
            addresses: [address],
            chainId: 1,
          },
        });
      expect(indexerRule).toBeDefined();
      const found = await IndexerRuleAllowlist.findOne({
        indexerRuleId: indexerRule._id,
      });

      expect(found._id.toString()).toEqual(allowlistRuleData._id.toString());
      expect(found.addresses[0]).toEqual(address);
      expect(indexerRule.ruleOwnerId.toString()).toEqual(role._id.toString());
      expect(indexerRule.ruleDataId.toString()).toEqual(found._id.toString());
    });
  });
});
