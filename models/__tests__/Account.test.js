/* eslint-disable no-undef */
const { createDb } = require("../../helpers/create-test-db");
const { getSignedMessage, wallet } = require("../../helpers/test-sign-wallet");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { AccountAddress } = require("../AccountAddress");
const { AccountNonce } = require("../AccountNonce");

describe("Account tests", () => {
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

  describe("createFromAddress", () => {
    it("should insert an account and an accountAddress into collection", async () => {
      account = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
        email: "foo@bar.com",
      });

      const newAccount = await Account.findOne({ _id: account._id });
      expect(newAccount._id).toEqual(account._id);
      expect(newAccount.addresses.length).toBe(1);
      const newNonce = await AccountNonce.findOne({ account: account._id });
      expect(newNonce).toBeTruthy();
      expect(parseInt(newNonce.nonce, 10)).toBeLessThan(10000);

      await newAccount.populate("addresses");
      expect(newAccount.addresses[0].address).toEqual(mockAddress);
    });

    it("should create an Account Nonce less than 10000", async () => {
      accountNonce = await AccountNonce.findOne({ account: account._id });
      expect(accountNonce).toBeTruthy();
      expect(parseInt(accountNonce.nonce, 10)).toBeLessThan(10000);
    });

    it("should not insert an account if chain id is invalid", async () => {
      expect.assertions(1);
      try {
        await Account.createFromAddress({
          address: mockAddress,
          chainId: 9999999999999,
          email: "foo@bar.com",
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid chain id");
      }
    });

    it("should not insert an account if address is invalid", async () => {
      expect.assertions(1);
      try {
        await Account.createFromAddress({
          address: "invalid address",
          chainId: 1,
          email: "foo@bar.com",
        });
      } catch (e) {
        expect(e.message).toMatch("invalid address");
      }
    });
  });

  describe("findByAddressAndChainId", () => {
    it("should return the account corresponding with the address and chain", async () => {
      const foundAccount = await Account.findByAddressAndChainId({
        address: mockAddress,
        chainId: mockChainId,
      });
      expect(foundAccount._id).toEqual(account._id);
    });

    it("should return null if not found", async () => {
      const foundAccount = await Account.findByAddressAndChainId({
        address: mockAddress,
        chainId: 9999999,
      });
      expect(foundAccount).toBeFalsy();
    });

    it("should return an error if address is invalid", async () => {
      try {
        await Account.findByAddressAndChainId({
          address: "invalid address",
          chainId: mockChainId,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe("verifySignature", () => {
    it("should return an error if account is not found", async () => {
      try {
        await Account.verifySignature({ address: mockAddress, chainId: 999 });
      } catch (e) {
        expect(e.message).toMatch("Account not found");
      }
    });
    it("should return an error if signature is invalid", async () => {
      try {
        await Account.verifySignature({
          address: mockAddress,
          chainId: mockChainId,
          signature: "0xfake",
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
    it("should return the account and account nonce if valid", async () => {
      const mockAccount = await Account.createFromAddress({
        address: wallet.address,
        chainId: mockChainId,
      });
      const mockNonce = await AccountNonce.findOne({
        account: mockAccount._id,
      });
      const { message } = await getSignedMessage(mockNonce.nonce);

      const res = await Account.verifySignature({
        address: wallet.address,
        chainId: mockChainId,
        signature: message,
      });

      expect(res.account._id).toEqual(mockAccount._id);
      expect(res.accountNonce._id).toEqual(mockNonce._id);
    });
  });

  describe("authBySignature", () => {
    it("should return an error if signature is invalid", async () => {
      try {
        // the geneerated wallet address is different than account's address
        const { message: invalidSignature } = await getSignedMessage(
          accountNonce.nonce
        );
        await Account.authBySignature({
          address: mockAddress,
          chainId: mockChainId,
          signature: invalidSignature,
        });
      } catch (e) {
        expect(e.message).toMatch("Unauthorized");
      }
    });
    it("should return generate a new nonce and generate an access token", async () => {
      const mockAccount = await Account.findOne({
        address: wallet.address,
        chainId: mockChainId,
      });
      const mockNonce = await AccountNonce.findOne({
        account: mockAccount._id,
      });
      const { message } = await getSignedMessage(mockNonce.nonce);

      const res = await Account.authBySignature({
        address: wallet.address,
        chainId: mockChainId,
        signature: message,
      });

      expect(res.accountNonce.nonce).not.toEqual(mockNonce.nonce);
      expect(res.accessToken).toBeTruthy();
    });
  });

  describe("updateMe", () => {
    it("Should update only relevant fields", async () => {
      const fields = {
        email: "nico@beb.xyz",
        username: "nico",
        location: "web3",
        badField: "blah",
      };
      account = await account.updateMe(fields);
      expect(account.email).toEqual("nico@beb.xyz");
      expect(account.username).toEqual("nico");
      expect(account.location).toEqual("web3");
    });

    it("Should ignore undefined fields while preserving null fields", async () => {
      const fields = { email: null, username: undefined };
      account = await account.updateMe(fields);

      expect(account.username).toEqual("nico");
      expect(account.email).toBeFalsy();
    });
    it("Should not insert a profile image if it does not exist", async () => {
      try {
        const fields = { profileImageId: account._id };
        account = await account.updateMe(fields);
      } catch (e) {
        expect(e.message).toMatch("Invalid Image Id");
      }
    });
  });

  describe("virtual property: addressId", () => {
    it("should return the first addressId", async () => {
      const accountAddress = await AccountAddress.findOne({
        account: account._id,
      });
      expect(account.addressId).toEqual(accountAddress._id);
    });
  });

  describe("_existingUsernameCheck", () => {
    it("should return True", async () => {
      const test_account = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: mockChainId,
        email: "foo@bar.com",
      });
      await test_account.updateMe({ username: "DarthVader" });
      const isExisting = await Account._existingUsernameCheck(
        test_account,
        "darthvader"
      );
      expect(isExisting).toEqual(true);
    });
  });
});
