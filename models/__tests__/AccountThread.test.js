/* eslint-disable no-undef */
const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Thread } = require("../Thread");
const { AccountThread } = require("../AccountThread");
const { ThreadMessage } = require("../ThreadMessage");
const { Account } = require("../Account");

describe("AccountThread tests", () => {
  let account; // the account used throughout this test suite
  let recipient; // the recipient account used throughout this test suite
  let thread; // the thread account <=> recipinet used throughout this test suite
  let accountThread; // the AccountThread for account
  let recipientAccountThread; // the AccountThread for recipient
  const mockAddress = getRandomAddress();
  const mockRecipientAddress = getRandomAddress();
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });

    recipient = await Account.createFromAddress({
      address: mockRecipientAddress,
      chainId: mockChainId,
    });

    [thread, [accountThread, recipientAccountThread]] =
      await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_existingAccountThread", () => {
    it("should return null if account thread does not exist", async () => {
      const res = await AccountThread._existingAccountThread({
        threadId: thread._id,
        accountId: mongoose.Types.ObjectId(),
      });
      expect(res).toBe(null);
    });

    it("should return null if accountId or threadId is not provided", async () => {
      const res = await AccountThread._existingAccountThread({
        threadId: thread._id,
      });
      expect(res).toBe(null);
    });

    it("should return the correct AccountThread", async () => {
      const res = await AccountThread._existingAccountThread({
        threadId: thread._id,
        accountId: recipient._id,
      });
      expect(res.account.toString()).toBe(
        recipientAccountThread.account.toString()
      );
      expect(res.thread.toString()).toBe(
        recipientAccountThread.thread.toString()
      );
      expect(res._id.toString()).toBe(recipientAccountThread._id.toString());
    });
  });

  describe("findOrCreate", () => {
    // @TODO add assertion for thread and account inetgrity
    // it("should throw an error if thread or sender is invalid", async () => {
    //   expect.assertions(1);
    //   try {
    //     await AccountThread.findOrCreate({
    //       threadId: mongoose.Types.ObjectId(),
    //       accountId: account._id,
    //     });
    //   } catch (e) {
    //     expect(e.message).toBe("Invalid Thread");
    //   }
    // });

    it("should return the existing AccountThread if applicable", async () => {
      const existing = await AccountThread.findOrCreate({
        threadId: thread._id,
        accountId: account._id,
      });
      expect(existing._id.toString()).toEqual(accountThread._id.toString());
    });

    it("should create a new AccountThread", async () => {
      const [newThread] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: getRandomAddress(),
        recipientChainId: mockChainId,
      });
      const created = await AccountThread.findOrCreate({
        threadId: newThread._id,
        accountId: account._id,
      });

      expect(created.account.toString()).toBe(account._id.toString());
      expect(created.thread.toString()).toBe(newThread._id.toString());
    });
  });

  describe("acceptAccountThread", () => {
    it("should throw an error if thread or account is not found", async () => {
      try {
        await AccountThread.acceptAccountThread({
          threadId: mongoose.Types.ObjectId(),
          accountId: account._id,
        });
      } catch (e) {
        expect(e.message).toBe("Invalid AccountThread");
      }
    });

    it("should modify the existing AccountThread to isAccepted = true", async () => {
      const existing = await AccountThread.acceptAccountThread({
        threadId: thread._id,
        accountId: recipient._id,
      });
      expect(existing.isAccepted).toEqual(true);
    });
  });

  describe("getAccountThreadByThread", () => {
    it("should return an empty array if no AccountThread is found", async () => {
      const accountThreads = await AccountThread.getAccountThreadByThread({
        threadId: mongoose.Types.ObjectId(),
      });
      expect(accountThreads.length).toEqual(0);
    });

    it("should get all existing account threads by thread id", async () => {
      const existing = await AccountThread.getAccountThreadByThread({
        threadId: thread._id,
      });
      expect(existing.length).toBeGreaterThanOrEqual(2);
    });

    it("should get all existing except self id", async () => {
      const existing = await AccountThread.getAccountThreadByThread({
        threadId: thread._id,
        exceptSelfId: account._id,
      });
      expect(existing.length).toBe(1);
      expect(existing[0].account.toString()).toBe(recipient._id.toString());
    });
  });

  describe("findAndSortByLatestThreadMessage", () => {
    let threadOne;
    let threadTwo;
    it("should get all account threads by account and sort by thread message", async () => {
      [threadOne] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: getRandomAddress(),
        recipientChainId: mockChainId,
      });
      [threadTwo] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: getRandomAddress(),
        recipientChainId: mockChainId,
      });
      // we are first sending a message in threadTwo
      await ThreadMessage.createForThread({
        threadId: threadTwo._id,
        senderId: account._id,
      });
      // then sending a message in threadOne
      await ThreadMessage.createForThread({
        threadId: threadOne._id,
        senderId: account._id,
      });
      // ...so threadOne should rank higher than threadTwo
      const accountThreads =
        await AccountThread.findAndSortByLatestThreadMessage(account._id);

      expect(accountThreads.length).toBeGreaterThanOrEqual(2);
      expect(accountThreads[0].thread._id.toString()).toMatch(
        threadOne._id.toString()
      );
      expect(accountThreads[1].thread._id.toString()).toMatch(
        threadTwo._id.toString()
      );
    });

    it("should return an empty array if no condition match", async () => {
      const accountThreads =
        await AccountThread.findAndSortByLatestThreadMessage(
          mongoose.Types.ObjectId()
        );

      expect(accountThreads.length).toBe(0);
    });

    it("should work with skip and limit", async () => {
      const accountThreads =
        await AccountThread.findAndSortByLatestThreadMessage(account._id, {
          limit: 1,
          offset: 1,
        });

      expect(accountThreads.length).toBe(1);
      expect(accountThreads[0].thread._id.toString()).toBe(
        threadTwo._id.toString()
      );
    });
  });
});
