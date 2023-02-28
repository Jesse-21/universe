/* eslint-disable no-undef */
const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Thread } = require("../Thread");
const { ThreadMessage } = require("../ThreadMessage");
const { AccountThread } = require("../AccountThread");
const { Account } = require("../Account");
const { AccountNonce } = require("../AccountNonce");

describe("Thread tests", () => {
  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_existingThreadBetweenAccounts", () => {
    let account;
    let recipient;

    const mockAddress = getRandomAddress();
    const mockRecipientAddress = getRandomAddress();
    const mockChainId = 1;

    it("should return null if no existing thread between accounts", async () => {
      account = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
      });
      recipient = await Account.createFromAddress({
        address: mockRecipientAddress,
        chainId: mockChainId,
      });
      const [thread] = await Thread._existingThreadBetweenAccounts({
        accountIdOne: account._id,
        accountIdTwo: recipient._id,
      });
      expect(thread).toBeFalsy();
    });

    it("should return the existing Thread if there is one", async () => {
      const [thread] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });
      const [found] = await Thread._existingThreadBetweenAccounts({
        accountIdOne: account._id,
        accountIdTwo: recipient._id,
      });
      expect(found._id.toString()).toMatch(thread._id.toString());
    });
  });

  describe("createThread", () => {
    let account;
    let recipient;
    let accountAndRecipientThread;

    const mockAddress = getRandomAddress();
    const mockRecipientAddress = getRandomAddress();
    const mockChainId = 1;

    it("should throw an error if account does not exist", async () => {
      try {
        await Thread.createThread({ fromAccountId: mongoose.Types.ObjectId() });
      } catch (e) {
        expect(e.message).toMatch("Invalid Account");
      }
    });

    it(`should create an account for the recipient if recipient account is not defined`, async () => {
      account = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
      });
      // recipient only has an address, their account hasnt been created
      const [thread] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });
      accountAndRecipientThread = thread;
      recipient = await Account.findByAddressAndChainId({
        address: mockRecipientAddress,
        chainId: mockChainId,
      });
      expect(recipient).toBeDefined();
    });

    it("should create a thread and two accountThreads", async () => {
      const newAccount = await Account.create({});
      const [thread, accountThreads] = await Thread.createThread({
        fromAccountId: newAccount._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });

      const senderAccountThread = await AccountThread.findOne({
        account: newAccount._id,
        thread: thread._id,
      });
      expect(senderAccountThread).toBeDefined();

      const recipientAccountThread = await AccountThread.findOne({
        account: recipient._id,
        thread: thread._id,
      });
      expect(recipientAccountThread).toBeDefined();

      expect(accountThreads.length).toBe(2);
      expect(accountThreads[0].account.toString()).toMatch(
        newAccount._id.toString()
      );
      expect(accountThreads[1].account.toString()).toMatch(
        recipient._id.toString()
      );
    });

    it("should not create a thread if a thread exists between accounts", async () => {
      const [thread] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });

      expect(thread._id.toString()).toEqual(
        accountAndRecipientThread._id.toString()
      );
    });

    it("should not create an accountThread if an accountThread exists", async () => {
      const existingAccountThread = await AccountThread.findOne({
        account: account._id,
        thread: accountAndRecipientThread._id,
      });
      const existingAccountThreadTwo = await AccountThread.findOne({
        account: recipient._id,
        thread: accountAndRecipientThread._id,
      });
      expect(existingAccountThread).toBeDefined();
      expect(existingAccountThreadTwo).toBeDefined();

      const [thread, accountThreads] = await Thread.createThread({
        fromAccountId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });
      const accountThreadsIds = [
        accountThreads[0]._id.toString(),
        accountThreads[1]._id.toString(),
      ];
      expect(accountThreadsIds).toContain(existingAccountThread._id.toString());
      expect(accountThreadsIds).toContain(
        existingAccountThreadTwo._id.toString()
      );
    });
  });

  describe("getRecipientsByThreadId", () => {
    const mockAddress = getRandomAddress();
    const mockRecipientAddress = getRandomAddress();
    const mockChainId = 1;

    it(`should return an empty array if thread is not found`, async () => {
      const emptyAccounts = await Thread.getRecipientsByThreadId({
        threadId: mongoose.Types.ObjectId(),
      });
      expect(emptyAccounts.length).toBe(0);
    });

    it(`should return all accounts associated with thread`, async () => {
      const acc1 = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
      });

      const [thread, accountThreads] = await Thread.createThread({
        fromAccountId: acc1._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });

      const accounts = await Thread.getRecipientsByThreadId({
        threadId: thread._id,
      });

      expect(accounts.length).toBe(2);
      const accountIds = [
        accountThreads[0].account.toString(),
        accountThreads[1].account.toString(),
      ];
      expect(accountIds).toContain(accounts[0]._id.toString());
      expect(accountIds).toContain(accounts[1]._id.toString());
    });

    it(`should return all accounts except self if exceptSelfId`, async () => {
      const acc1 = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
      });

      const [thread, accountThreads] = await Thread.createThread({
        fromAccountId: acc1._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
      });

      const recipients = await Thread.getRecipientsByThreadId({
        threadId: thread._id,
        exceptSelfId: acc1._id,
      });

      expect(recipients.length).toBe(1);
      const recipientId = accountThreads[1].account.toString();
      expect(recipients[0]._id.toString()).toMatch(recipientId);
    });
  });

  describe("getMessages", () => {
    it(`should get the latest ThreadMessage first`, async () => {
      const thread = await Thread.findOne({});
      const sender = await AccountThread.findOne({ thread: thread._id });

      await ThreadMessage.createForThread({
        threadId: thread._id,
        senderId: sender.account,
        contentRaw: "Hello!",
      });
      await ThreadMessage.createForThread({
        threadId: thread._id,
        senderId: sender.account,
        contentRaw: "Hello1!",
      });
      await ThreadMessage.createForThread({
        threadId: thread._id,
        senderId: sender.account,
        contentRaw: "Hello2!",
      });

      const messages = await Thread.getMessages(thread._id);
      expect(messages.length).toBeGreaterThanOrEqual(3);
      expect(messages[0].richContent.content.raw).toEqual("Hello2!");
    });
  });

  describe("createStakedThread", () => {
    let account;
    let thread;
    let threadTransaction;
    let recipient;

    const mockAddress = getRandomAddress();
    const mockRecipientAddress = getRandomAddress();
    const mockChainId = 1;

    it("should throw an error if account does not exist", async () => {
      try {
        await Thread.createStakedThread({
          senderId: mongoose.Types.ObjectId(),
        });
      } catch (e) {
        expect(e.message).toMatch("Invalid Account");
      }
    });

    it(`should create a thread and a thread transaction`, async () => {
      account = await Account.createFromAddress({
        address: mockAddress,
        chainId: mockChainId,
      });
      recipient = await Account.createFromAddress({
        address: mockRecipientAddress,
        chainId: mockChainId,
      });

      [thread, threadTransaction] = await Thread.createStakedThread({
        senderId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
        nonce: 1,
        tokenAmount: "0.1",
        signature: "hashedSignature",
        transactionHash: "0x1283",
      });
      expect(thread).toBeDefined();
      expect(threadTransaction.thread.toString()).toBe(thread._id.toString());
      expect(threadTransaction.recipient.toString()).toBe(
        recipient._id.toString()
      );
      expect(threadTransaction.sender.toString()).toBe(account._id.toString());
    });

    it(`should regenerate account's transactionNonce`, async () => {
      const oldNonce = await AccountNonce.findOne({ account: account._id });

      await Thread.createStakedThread({
        senderId: account._id,
        recipientAddress: mockRecipientAddress,
        recipientChainId: mockChainId,
        nonce: 1,
        tokenAmount: "0.1",
        signature: "hashedSignature",
        transactionHash: "0x1283",
      });

      const newNonce = await AccountNonce.findOne({ account: account._id });

      expect(oldNonce.transactionNonce).not.toBe(newNonce.transactionNonce);
    });
  });
});
