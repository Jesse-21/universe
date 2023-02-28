const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { AccountRelationship } = require("../AccountRelationship");

describe("AccountRelationship tests", () => {
  let db;
  let account;
  let influencer;

  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    account = await Account.createFromAddress({
      address: getRandomAddress(),
      chainId: mockChainId,
    });
    influencer = await Account.createFromAddress({
      address: getRandomAddress(),
      chainId: mockChainId,
    });
  });

  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_existingAccountRelationship", () => {
    it("should return falsy if no existing relationship found", async () => {
      const relationship =
        await AccountRelationship._existingAccountRelationship({
          from: account._id,
          to: influencer._id,
        });
      expect(relationship).toBeFalsy();
    });
  });

  describe("toggleFollow", () => {
    let createdRelationship;
    it("should create an AccountRelationship with isFollowing = true if no existing", async () => {
      const relationship = await AccountRelationship.toggleFollow({
        from: account._id,
        to: influencer._id,
      });
      createdRelationship = relationship;
      expect(relationship.isFollowing).toBe(true);
    });

    it("should toggle isFollowing but not create a new document if existing AccountRelationship", async () => {
      const relationship = await AccountRelationship.toggleFollow({
        from: account._id,
        to: influencer._id,
      });

      expect(relationship._id.toString()).toBe(
        createdRelationship._id.toString()
      );
      expect(relationship.isFollowing).toBe(false);
    });
  });

  describe("getTwoWayRelationship", () => {
    it("should get the relationship between account 'from' to account 'to' ", async () => {
      let twoWayRelationship;

      await AccountRelationship.toggleFollow({
        from: influencer._id,
        to: account._id,
      });
      await AccountRelationship.toggleFollow({
        from: account._id,
        to: influencer._id,
      });
      twoWayRelationship = await AccountRelationship.getTwoWayRelationship({
        from: account._id,
        to: influencer._id,
      });
      expect(twoWayRelationship.iFollowThem).toBe(true);
      expect(twoWayRelationship.theyFollowMe).toBe(true);

      await AccountRelationship.toggleFollow({
        from: influencer._id,
        to: account._id,
      });
      await AccountRelationship.toggleFollow({
        from: account._id,
        to: influencer._id,
      });
      twoWayRelationship = await AccountRelationship.getTwoWayRelationship({
        from: account._id,
        to: influencer._id,
      });
      expect(twoWayRelationship.iFollowThem).toBe(false);
      expect(twoWayRelationship.theyFollowMe).toBe(false);
    });
  });

  describe("getAccountRelationships", () => {
    let influencer2;
    let influencer3;

    it("should work with filters from and isFollowing", async () => {
      influencer2 = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: mockChainId,
      });
      influencer3 = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: mockChainId,
      });
      await AccountRelationship.toggleFollow({
        from: account._id,
        to: influencer2._id,
      });
      await AccountRelationship.toggleFollow({
        from: account._id,
        to: influencer3._id,
      });

      const relationships = await AccountRelationship.getAccountRelationships({
        filters: {
          from: account._id,
          isFollowing: true,
        },
      });
      expect(relationships.length).toBe(2);
      expect(relationships[0].to.toString()).toBe(influencer3._id.toString());
      expect(relationships[1].to.toString()).toBe(influencer2._id.toString());
    });

    /** influencer 2 and influencer 3 are now connected to account */
    it("should work with filters to and isFollowing", async () => {
      await AccountRelationship.toggleFollow({
        from: influencer2._id,
        to: account._id,
      });
      await AccountRelationship.toggleFollow({
        from: influencer3._id,
        to: account._id,
      });

      const relationships = await AccountRelationship.getAccountRelationships({
        filters: {
          to: account._id,
          isFollowing: true,
        },
      });
      expect(relationships.length).toBe(2);
      expect(relationships[0].from.toString()).toBe(influencer3._id.toString());
      expect(relationships[1].from.toString()).toBe(influencer2._id.toString());
    });

    it("should work with both filters from and to", async () => {
      const relationship = await AccountRelationship.findOne({
        from: account._id,
        to: influencer._id,
      });

      const relationships = await AccountRelationship.getAccountRelationships({
        filters: {
          from: account._id,
          to: influencer._id,
        },
      });
      expect(relationships[0]._id.toString()).toBe(relationship._id.toString());
    });

    it("should work with both filters from and excludeNotConnected", async () => {
      /** influencer is not connected to account since account is not following them */
      await AccountRelationship.toggleFollow({
        from: influencer._id,
        to: account._id,
      });

      const relationships = await AccountRelationship.getAccountRelationships({
        filters: {
          from: account._id,
          excludeNotConnected: true,
        },
      });

      expect(relationships.length).toBe(2);
      expect(relationships[0].from.toString()).toBe(influencer3._id.toString());
      expect(relationships[1].from.toString()).toBe(influencer2._id.toString());
    });
  });
});
