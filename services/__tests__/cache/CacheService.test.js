const {
  Service: _CacheService,
} = require("../../../services/cache/CacheService");

const { KeyValueCache } = require("../../../models/cache/KeyValueCache");
const { Account } = require("../../../models/Account");

const { createDb } = require("../../../helpers/create-test-db");
const { getRandomAddress } = require("../../../helpers/get-random-address");

describe("Cache Service tests", () => {
  let db;
  let account;
  let CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    const mockAddress = getRandomAddress();
    const mockChainId = 1;
    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });

    CacheService = new _CacheService();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("normalize", () => {
    it("should return normalized key for special key types", async () => {
      const normalizedKey = CacheService.normalize({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });

      expect(normalizedKey).toBe(
        "ExploreFeedCommunities:Account:" + account._id.toString()
      );
    });

    it("should return normalized key for non special key types", async () => {
      const normalizedKey = CacheService.normalize({
        key: "NiceKey",
        params: {
          accountId: account._id,
        },
      });

      expect(normalizedKey).toBe(
        "NiceKey:" + JSON.stringify({ accountId: account._id })
      );
    });
  });

  describe("set", () => {
    it("should set any value with normalized key for special key types", async () => {
      const value = ["1", "2", "3"];
      await CacheService.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
        value,
      });

      const normalizedKey = CacheService.normalize({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });

      const found = await KeyValueCache.findOne({
        key: normalizedKey,
      });

      expect(found).toBeDefined();
    });

    it("should update the value and the expires at if key is already set", async () => {
      const value = ["4", "5", "6"];
      // 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await CacheService.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
        value,
        expiresAt,
      });

      const normalizedKey = CacheService.normalize({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });

      const found = await KeyValueCache.findOne({
        key: normalizedKey,
      });

      expect(found.value).toBe(JSON.stringify({ value }));
      expect(found.expiresAt.toString()).toBe(expiresAt.toString());
    });
  });

  describe("get", () => {
    it("should get any value already set keys if not expired", async () => {
      const value = ["1", "2", "3"];
      await CacheService.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
        value,
      });

      const found = await CacheService.get({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });

      expect(found[0]).toBe(value[0]);
      expect(found[1]).toBe(value[1]);
      expect(found[2]).toBe(value[2]);
    });

    it("should return null if expired", async () => {
      const value = ["4", "5", "6"];
      const expiresAt = new Date();
      await CacheService.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
        value,
        expiresAt,
      });

      const found = await CacheService.get({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });

      expect(found).toBe(null);
    });
  });

  describe("getOrCallbackAndSet", () => {
    it("should get any value already set if not expired", async () => {
      const value = ["1", "2", "3"];
      await CacheService.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
        value,
      });

      const found = await CacheService.getOrCallbackAndSet(null, {
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });

      expect(found[0]).toBe(value[0]);
      expect(found[1]).toBe(value[1]);
      expect(found[2]).toBe(value[2]);
    });

    it("if null, should call callback and set the value", async () => {
      const value = ["4", "5", "6"];
      const callbackValue = ["1", "2", "3"];

      const callBack = () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(callbackValue);
          }, 1000);
        });
      };
      await CacheService.set({
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
        value,
        expiresAt: new Date(),
      });

      const found = await CacheService.getOrCallbackAndSet(callBack, {
        key: "ExploreFeedCommunities",
        params: {
          accountId: account._id,
        },
      });
      await callBack(); // wait 1s for the cache to set as it is async

      expect(found[0]).toBe(callbackValue[0]);
      expect(found[1]).toBe(callbackValue[1]);
      expect(found[2]).toBe(callbackValue[2]);
    });
  });
});
