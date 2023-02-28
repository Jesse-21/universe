const { createDb } = require("../create-test-db");
const { getSignedMessage, wallet } = require("../test-sign-wallet");
const { requireAuth } = require("../auth-middleware");

const { Account } = require("../../models/Account");
const { AccountNonce } = require("../../models/AccountNonce");

describe("Auth middleware tests", () => {
  let db;
  let account;
  let accountNonce;

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

  describe("authBySignature", () => {
    it("should decode the correct access token", async () => {
      account = await Account.createFromAddress({
        address: wallet.address,
        chainId: mockChainId,
      });
      accountNonce = await AccountNonce.findOne({ account: account._id });
      const { message } = await getSignedMessage(accountNonce.nonce);
      const { accessToken } = await Account.authBySignature({ address: wallet.address, chainId: mockChainId, signature: message });
      const data = await requireAuth(accessToken);

      expect(data.payload.id).toEqual(account._id.toString());
    });
  });

});