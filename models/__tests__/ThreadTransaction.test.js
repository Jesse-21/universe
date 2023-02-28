/* eslint-disable no-undef */
const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Thread } = require("../Thread");
const { ThreadTransaction } = require("../ThreadTransaction");
const { Account } = require("../Account");

describe("ThreadTransaction tests", () => {
  let account; // the account used throughout this test suite
  let recipient; // the recipient account used throughout this test suite
  let thread; // the thread account <=> recipinet used throughout this test suite
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
    [thread] = await Thread.createThread({
      fromAccountId: account._id,
      recipientAddress: mockRecipientAddress,
      recipientChainId: mockChainId,
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("completeTransaction", () => {
    it("should throw an error if threadTransactionId is invalid", async () => {
      try {
        await ThreadTransaction.completeTransaction({
          threadTransactionId: mongoose.Types.ObjectId(),
        });
      } catch (e) {
        expect(e.message).toBe("Invalid Transaction");
      }
    });

    it("should modify the thread transaction with given param", async () => {
      const threadTransaction = await ThreadTransaction.createNewStake({
        threadId: thread._id,
        senderId: account._id,
        recipientId: recipient._id,
        nonce: 1,
        tokenAmount: "0.1",
        signature: "hashedSignature",
        transactionHash: "niceHash",
      });
      const updated = await ThreadTransaction.completeTransaction({
        threadTransactionId: threadTransaction._id,
        completionTransactionHash: "completionHash",
      });

      expect(updated.isCompleted).toBe(true);
      expect(updated.completionTransactionHash).toBe("completionHash");
    });
  });
});
