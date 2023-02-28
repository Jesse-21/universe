const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { Community } = require("../Community");
const { Permission } = require("../Permission");

describe("Permission tests", () => {
  let db;
  let account;
  let community;
  let permission;

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
    community = await Community.create({ name: "community" });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("create", () => {
    it("should create a new permission", async () => {
      permission = await Permission.create({
        communityId: community._id,
        name: "permission",
        description: {
          raw: "read",
        },
        editable: true,
        bitwisePosition: 1,
        uniqueIdentifier: "read",
      });
      const found = await Permission.findOne({
        uniqueIdentifier: "read",
        communityId: community._id,
      });
      expect(found._id.toString()).toBe(permission._id.toString());
      expect(permission.uniqueIdentifier).toBe("read");
      expect(permission.description.raw).toBe("read");
      expect(permission.bitwisePosition).toBe(1);
      expect(permission.bitwiseFlag).toBe(`${1 << 1}`);
    });
    it("should throw an error if unique identifier has been taken in community", async () => {
      expect.assertions(1);
      try {
        await Permission.create({
          communityId: community._id,
          name: "permission",
          uniqueIdentifier: "read",
        });
      } catch (e) {
        expect(e.message).toBe("Unique identifier read already token");
      }
    });
  });

  describe("_generateBitwiseFlagAndPosition", () => {
    it("should generate a permission's bitwiseFlag and bitwisePosition", async () => {
      const temp = permission._generateBitwiseFlagAndPosition(2);
      expect(temp.bitwisePosition).toBe(2);
      expect(temp.bitwiseFlag).toBe(`${1 << 2}`);
    });
    it("should handle big bitwiseFlag and bitwisePosition", async () => {
      const temp = permission._generateBitwiseFlagAndPosition(62);
      expect(temp.bitwisePosition).toBe(62);
      expect(temp.bitwiseFlag).toBe(`${1 << 62}`);
    });
    it("should throw an error if bitwise position is invalid", async () => {
      expect.assertions(1);
      try {
        permission._generateBitwiseFlagAndPosition(100);
      } catch (e) {
        expect(e.message).toBe(
          "Invalid bitwisePosition: must be between 0 and 62"
        );
      }
    });
  });

  describe("findByUniqueIdentifierOrId", () => {
    it("should find by id if exists", async () => {
      const found = await Permission.findByUniqueIdentifierOrId({
        permissionId: permission._id,
      });
      expect(found._id.toString()).toBe(permission._id.toString());
    });
    it("should return null if unique identifier is not provided, and community is not provided", async () => {
      expect.assertions(1);
      const found = await Permission.findByUniqueIdentifierOrId({
        uniqueIdentifier: "read",
      });
      expect(found).toBeNull();
    });
    it("should find by unique identifier and communityId if permissionId is not valid", async () => {
      expect.assertions(1);
      const found = await Permission.findByUniqueIdentifierOrId({
        uniqueIdentifier: "read",
        communityId: community._id,
        permissionId: mongoose.Types.ObjectId(),
      });
      expect(found._id.toString()).toBe(permission._id.toString());
    });
  });
});
