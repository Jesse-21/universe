const { createDb } = require("../../helpers/create-test-db");
const { getSignedMessage, wallet } = require("../../helpers/test-sign-wallet");
const { getRandomAddress } = require("../../helpers/get-random-address");
const { generateNewAccessTokenFromAccount } = require("../../helpers/jwt");

const { Account } = require("../../models/Account");
const { AccountNonce } = require("../../models/AccountNonce");

const { Service } = require("../AuthService");

describe("AuthService tests", () => {
  let db;
  let account;
  let AuthService;

  const mockAddress = wallet.address;
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });
    AuthService = new Service();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("verifySignature", () => {
    it("should return an error if account is not found", async () => {
      expect.assertions(1);
      try {
        await AuthService.verifySignature({
          address: getRandomAddress(),
          chainId: 999,
        });
      } catch (e) {
        expect(e.message).toMatch("Account not found");
      }
    });
    it("should return an error if signature is invalid", async () => {
      expect.assertions(1);
      try {
        await AuthService.verifySignature({
          address: mockAddress,
          chainId: mockChainId,
          signature: "0xfake",
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
    it("should return the account and account nonce if valid", async () => {
      const accountNonce = await AccountNonce.findOne({
        account: account._id,
      });
      const { message } = await getSignedMessage(accountNonce.nonce);

      const res = await AuthService.verifySignature({
        address: mockAddress,
        chainId: mockChainId,
        signature: message,
      });

      expect(res.account._id.toString()).toEqual(account._id.toString());
      expect(res.accountNonce._id.toString()).toEqual(
        accountNonce._id.toString()
      );
    });
  });

  describe("authBySignature", () => {
    it("should return an error if signature is invalid", async () => {
      expect.assertions(1);
      try {
        const badAddress = getRandomAddress();
        const badAccount = await Account.createFromAddress({
          address: badAddress,
          chainId: mockChainId,
        });
        const accountNonce = await AccountNonce.findOne({
          account: badAccount._id,
        });

        const { message: invalidSignature } = await getSignedMessage(
          accountNonce.nonce
        );

        // the geneerated wallet address is different than account's address
        await AuthService.authBySignature({
          address: badAddress,
          chainId: mockChainId,
          signature: invalidSignature,
        });
      } catch (e) {
        expect(e.message).toMatch("Unauthorized");
      }
    });
    it("should return account if valid", async () => {
      const accountNonce = await AccountNonce.findOne({
        account: account._id,
      });
      const { message } = await getSignedMessage(accountNonce.nonce);

      const _account = await AuthService.authBySignature({
        address: mockAddress,
        chainId: mockChainId,
        signature: message,
      });

      expect(_account._id.toString()).toEqual(account._id.toString());
    });
  });

  describe("authenticate", () => {
    it("should throw an error if account does not exist", async () => {
      expect.assertions(1);
      try {
        await AuthService.authenticate({
          address: getRandomAddress(),
          chainId: mockChainId,
        });
      } catch (e) {
        expect(e.message).toBe("Account not found");
      }
    });

    it("should generate a new nonce and generate an access token", async () => {
      const accountNonce = await AccountNonce.findOne({
        account: account._id,
      });
      const { message } = await getSignedMessage(accountNonce.nonce);

      const res = await AuthService.authenticate({
        address: mockAddress,
        chainId: mockChainId,
        signature: message,
      });
      const updatedAccount = await Account.findById(account._id);
      const accessToken = await generateNewAccessTokenFromAccount(
        updatedAccount
      );

      expect(res.accountNonce.nonce).not.toEqual(accountNonce.nonce);
      expect(res.accessToken).toEqual(accessToken);
    });
  });
});
