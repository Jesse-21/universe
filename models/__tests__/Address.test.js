const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Address } = require("../Address");

describe("Address tests", () => {
  let db;

  const mockAddress = getRandomAddress();
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("findOrCreate", () => {
    let address;
    it("should generate a new Address with valid address and chainId", async () => {
      address = await Address.findOrCreate({
        address: mockAddress,
        chainId: mockChainId,
      });
      const created = await Address.findOne({ address: mockAddress });
      expect(created.address).toEqual(mockAddress);
      expect(created.chain.chainId).toEqual(mockChainId);
    });
    it("should return the existing address if creating non-unique addresses", async () => {
      const existing = await Address.findOrCreate({
        address: mockAddress,
        chainId: mockChainId,
      });
      expect(existing.address).toEqual(mockAddress);
      expect(existing.chain.chainId).toEqual(mockChainId);
      expect(existing._id.toString()).toEqual(address._id.toString());
    });
  });
});
