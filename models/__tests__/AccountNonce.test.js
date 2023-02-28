const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getSignedMessage } = require("../../helpers/test-sign-wallet");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { AccountNonce } = require("../AccountNonce");

describe("AccountNonce tests", () => {
  let db;
  let account;
  let accountNonce;

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

  describe("create", () => {
    it("should generate a new Account Nonce less than 10000", async () => {
      account = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
        email: "foo@bar.com",
      });

      accountNonce = await AccountNonce.findOne({ account: account._id });
      expect(accountNonce).toBeTruthy();
      expect(parseInt(accountNonce.nonce, 10)).toBeLessThan(10000);
    });
  });

  describe("generateNewNonce", () => {
    it("should generate a new nonce", async () => {
      const oldOnce = accountNonce.nonce;
      await accountNonce.generateNewNonce();
      expect(oldOnce).not.toBe(accountNonce.nonce);
    });
  });

  describe("generateNewTransactionNonce", () => {
    it("should generate a new nonce", async () => {
      const oldOnce = accountNonce.transactionNonce;
      await accountNonce.generateNewTransactionNonce();
      expect(oldOnce).not.toBe(accountNonce.transactionNonce);
    });
  });

  describe("generateNewTransactionNonceByAccountId", () => {
    it("should generate a new nonce for accountId", async () => {
      const oldOnce = accountNonce.transactionNonce;
      const updatedAccountNonce =
        await AccountNonce.generateNewTransactionNonceByAccountId(
          accountNonce.account
        );
      expect(oldOnce).not.toBe(updatedAccountNonce.transactionNonce);
    });

    it("should throw an error for invalid account nonce", async () => {
      expect.assertions(1);
      try {
        await AccountNonce.generateNewTransactionNonceByAccountId(
          mongoose.Types.ObjectId()
        );
      } catch (e) {
        expect(e.message).toBe("Invalid account nonce");
      }
    });
  });

  describe("decodeAddressBySignature", () => {
    it("should decode the signature", async () => {
      const { message, address } = await getSignedMessage(accountNonce.nonce);
      const decodedAddress = await accountNonce.decodeAddressBySignature(
        message
      );
      expect(decodedAddress.toLowerCase()).toBe(address.toLowerCase());
    });
  });
});
