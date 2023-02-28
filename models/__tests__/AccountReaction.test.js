const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { Post } = require("../Post");
const { AccountReaction } = require("../AccountReaction");

describe("AccountReaction tests", () => {
  let db;
  let account;
  let post;

  const mockAddress = getRandomAddress();
  const mockChainId = 1;

  beforeEach(() => jest.clearAllMocks());
  beforeAll(async () => {
    db = await createDb();
    await db.connect();

    account = await Account.createFromAddress({
      address: mockAddress,
      chainId: mockChainId,
    });

    post = await Post.createForAccount({
      accountId: account._id,
      contentRaw: "HI",
    });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("reactForPost", () => {
    it("should throw an error for an invalid  post", async () => {
      expect.assertions(1);
      try {
        await AccountReaction.reactForPost({
          accountId: mongoose.Types.ObjectId(),
          postId: mongoose.Types.ObjectId(),
          reactionType: "LIKES",
          amount: 1,
        });
      } catch (e) {
        expect(e.message).toContain("Invalid post");
      }
    });

    it("should create an AccountReaction", async () => {
      const [_, accountReaction] = await AccountReaction.reactForPost({
        accountId: account._id,
        postId: post._id,
        reactionType: "LIKES",
        amount: 1,
      });
      expect(accountReaction.reactionObjectTypeId.toString()).toBe(
        post._id.toString()
      );
      expect(accountReaction.account.toString()).toBe(account._id.toString());
      expect(accountReaction.reactions.likes).toBe(1);
    });

    it("should find and toggle the existing AccountReaction", async () => {
      const [_, _accountReaction] = await AccountReaction.reactForPost({
        accountId: account._id,
        postId: post._id,
        reactionType: "LIKES",
        amount: 0,
      });
      const accountReaction = await AccountReaction.find({
        accountId: account._id,
        reactionObjectTypeId: post._id,
        reactionObjectType: "POST",
      });

      expect(accountReaction.length).toBe(1);
      expect(accountReaction[0]._id.toString()).toBe(
        _accountReaction._id.toString()
      );
      expect(accountReaction[0].reactions.likes).toBe(0);
    });
  });

  describe("countReactionsByPostId", () => {
    it("should count the total amount of likes per post", async () => {
      const newAccount = await Account.createFromAddress({
        address: getRandomAddress(),
        chainId: mockChainId,
      });
      await AccountReaction.reactForPost({
        accountId: newAccount._id,
        postId: post._id,
        reactionType: "LIKES",
        amount: 1,
      });
      const reactionAmount = await AccountReaction.countReactionsByPostId(
        post._id
      );
      expect(reactionAmount).toBeGreaterThanOrEqual(1);
      await AccountReaction.reactForPost({
        accountId: newAccount._id,
        postId: post._id,
        reactionType: "LIKES",
        amount: -1,
      });
      const reactionAmountAfterToggle =
        await AccountReaction.countReactionsByPostId(post._id);
      expect(reactionAmountAfterToggle).toBe(0);
    });
  });
});
