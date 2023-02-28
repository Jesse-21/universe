const mongoose = require("mongoose");
const BigInt = require("big-integer");

const { createDb } = require("../../helpers/create-test-db");

const { Community } = require("../../models/Community");

const { Service: _PermissionService } = require("../PermissionService");
const { Service: _CommunityService } = require("../CommunityService");

describe("PermissionService tests", () => {
  let db;
  let PermissionService;
  let CommunityService;
  let permission1; // read, bitwise position 0
  let permission2; // write, bitwise position 0
  let community;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    community = await Community.create({
      name: "community",
    });

    PermissionService = new _PermissionService();
    CommunityService = new _CommunityService();

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

  describe("generatePermissionStringFromIds", () => {
    it("should generate a permission string depending on an array of permission Ids", async () => {
      const permissionString =
        await PermissionService.generatePermissionStringFromIds([
          permission1._id,
        ]);
      expect(permissionString).toBe(BigInt(permission1.bitwiseFlag).toString());
    });

    it("should work with multiple permission Ids", async () => {
      const permission3 = await CommunityService.createPermissionForCommunity(
        community,
        {
          name: "3",
          uniqueIdentifier: "3",
          editable: true,
        }
      );
      const permission4 = await CommunityService.createPermissionForCommunity(
        community,
        {
          name: "4",
          uniqueIdentifier: "4",
          editable: true,
        }
      );
      const permission5 = await CommunityService.createPermissionForCommunity(
        community,
        {
          name: "5",
          uniqueIdentifier: "5",
          editable: true,
        }
      );

      const permissionString =
        await PermissionService.generatePermissionStringFromIds([
          permission1._id,
          permission2._id,
          permission3._id,
          permission4._id,
          permission5._id,
        ]);
      expect(permissionString).toBe(
        (
          BigInt(permission1.bitwiseFlag) |
          BigInt(permission2.bitwiseFlag) |
          BigInt(permission3.bitwiseFlag) |
          BigInt(permission4.bitwiseFlag) |
          BigInt(permission5.bitwiseFlag)
        ).toString()
      );
    });

    it("should return empty permission if no permission Ids are provided", async () => {
      const permissionString =
        await PermissionService.generatePermissionStringFromIds([]);
      //
      expect(permissionString).toBe(null);
    });
  });

  describe("isFlagSetForPermissionString", () => {
    it("should assert if a permission string contains a bitwise flag", async () => {
      const permissionString =
        await PermissionService.generatePermissionStringFromIds([
          permission1._id,
          permission2._id,
        ]);
      expect(
        PermissionService.isFlagSetForPermissionString(
          permissionString,
          permission1.bitwiseFlag
        )
      ).toBe(true);
      expect(
        PermissionService.isFlagSetForPermissionString(
          permissionString,
          permission2.bitwiseFlag
        )
      ).toBe(true);
      expect(
        PermissionService.isFlagSetForPermissionString(permissionString, null)
      ).toBe(false);
      expect(
        PermissionService.isFlagSetForPermissionString(permissionString, "4")
      ).toBe(false);
    });
  });

  describe("isFlagSetForPermissionStringById", () => {
    it("should assert if a permission string contains a permissionId", async () => {
      const permissionString =
        await PermissionService.generatePermissionStringFromIds([
          permission1._id,
          permission2._id,
        ]);
      expect(
        await PermissionService.isFlagSetForPermissionStringById(
          permissionString,
          permission1._id
        )
      ).toBe(true);
      expect(
        await PermissionService.isFlagSetForPermissionStringById(
          permissionString,
          permission2._id
        )
      ).toBe(true);
      expect(
        await PermissionService.isFlagSetForPermissionStringById(
          permissionString,
          null
        )
      ).toBe(false);
      expect(
        await PermissionService.isFlagSetForPermissionStringById(
          permissionString,
          mongoose.Types.ObjectId()
        )
      ).toBe(false);
    });
  });
});
