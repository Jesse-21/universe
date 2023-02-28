const { createDb } = require("../../helpers/create-test-db");

const { Community } = require("../Community");

describe("Community tests", () => {
  let db;
  let community;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    community = await Community.create({
      name: "Beta users",
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("findAndSort", () => {
    it("should find and sort communities", async () => {
      expect.assertions(1);

      const communities = await Community.findAndSort({
        sort: "trendy",
      });
      expect(communities[0].name).toBe(community.name);
    });
  });
});
