/* eslint-disable no-undef */
const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Thread } = require("../Thread");
const { ThreadMessage } = require("../ThreadMessage");
const { Account } = require("../Account");

describe("ThreadMessage tests", () => {
  let account; // the account used throughout this test suite
  let recipient; // the recipient account used throughout this test suite
  let thread; // the thread account <=> recipinet used throughout this test suite
  let accountThreads; // the account threads for account and recipient
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
    [thread, accountThreads] = await Thread.createThread({
      fromAccountId: account._id,
      recipientAddress: mockRecipientAddress,
      recipientChainId: mockChainId,
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_verifyThreadAndSender", () => {
    it("should throw an error if thread does not belong to account", async () => {
      try {
        await ThreadMessage._verifyThreadAndSender({
          threadId: mongoose.Types.ObjectId(),
          senderId: account._id,
        });
      } catch (e) {
        expect(e.message).toBe("Invalid Thread or Sender");
      }
    });

    it("should return true if thread and account are valid", async () => {
      const res = await ThreadMessage._verifyThreadAndSender({
        threadId: thread._id,
        senderId: recipient._id,
      });
      expect(res).toBe(true);
    });
  });

  // describe("_updateThreadUpdatedAt", () => {
  //   it("should throw an error if thread does not exist", async () => {
  //     try {
  //       await ThreadMessage._updateThreadUpdatedAt(mongoose.Types.ObjectId());
  //     } catch (e) {
  //       expect(e).toBeInstanceOf(Error);
  //     }
  //   });

  //   it("should return the updated thread and accoun threads", async () => {
  //     const spy = jest.spyOn(global, "Date"); // spy on Date
  //     const [updatedThread, updatedAccountThreads] =
  //       await ThreadMessage._updateThreadUpdatedAt({
  //         threadId: thread._id,
  //         senderId: recipient._id,
  //       });
  //     const date = spy.mock.instances[0]; // get what 'new Date()' returned

  //     expect(updatedThread.updatedAt).toBe(date);
  //     expect(updatedAccountThreads[0].updatedAt).toBe(date);
  //     expect(updatedAccountThreads[1].updatedAt).toBe(date);
  //   });
  // });

  describe("createForThread", () => {
    it("should throw an error if thread or sender is invalid", async () => {
      try {
        await ThreadMessage._verifyThreadAndSender({
          threadId: mongoose.Types.ObjectId(),
          senderId: account._id,
        });
      } catch (e) {
        expect(e.message).toBe("Invalid Thread or Sender");
      }
    });

    it("should create a new ThreadMessage", async () => {
      const threadMessage = await ThreadMessage.createForThread({
        threadId: thread._id,
        senderId: account._id,
        contentRaw: "hello!",
      });
      const messages = await ThreadMessage.find({ thread: thread._id });
      expect(messages.length).toBeGreaterThanOrEqual(1);

      expect(threadMessage.sender.toString()).toBe(account._id.toString());
      expect(threadMessage.richContent.content.raw).toBe("hello!");
    });
  });
});
