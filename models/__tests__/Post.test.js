const mongoose = require("mongoose");

const { createDb } = require("../../helpers/create-test-db");
const { getRandomAddress } = require("../../helpers/get-random-address");

const { Account } = require("../Account");
const { Community } = require("../Community");
const { Post } = require("../Post");

describe("Post tests", () => {
  let db;
  let account;
  let community1;
  let community2;
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
    community1 = await Community.create({ name: "community1" });
    community2 = await Community.create({ name: "community2" });
  });
  afterAll(async () => {
    await db.clearDatabase();
    await db.closeDatabase();
  });

  describe("_verifyAndUpdateParentReplies", () => {
    it("should throw an error for an invalid parent post", async () => {
      expect.assertions(1);
      try {
        await Post._verifyAndUpdateParentReplies({
          parentId: mongoose.Types.ObjectId(),
          postId: mongoose.Types.ObjectId(),
        });
      } catch (e) {
        expect(e.message).toBe("Invalid parent id");
      }
    });
  });
  describe("createForAccount", () => {
    it("should create a post", async () => {
      post = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "HI",
      });
      const found = await Post.findById(post._id);
      expect(found.account.toString()).toEqual(account._id.toString());
    });

    it("should insert the post id into parent replies array", async () => {
      const comment = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "HI comment",
        parentId: post._id,
      });
      post = await Post.findById(post._id);
      expect(post.replies.length).toBeGreaterThanOrEqual(1);
      expect(comment.parent.toString()).toBe(post._id.toString());

      await post.populate({ path: "replies" });
      expect(post.replies[0]._id.toString()).toBe(comment._id.toString());
    });
  });

  describe("findAndSortByLatest", () => {
    it("should find posts by account if the account filter is active", async () => {
      const posts = await Post.findAndSortByLatest({
        filters: { account: account._id },
      });
      const found = await Post.find({
        account: account._id,
      }).sort("-createdAt");
      expect(found.length).toEqual(posts.length);
      expect(found[0]._id.toString()).toEqual(posts[0]._id.toString());
      expect(found[1]._id.toString()).toEqual(posts[1]._id.toString());
    });

    it("should find posts by parent if the post filter is active", async () => {
      const comments = await Post.findAndSortByLatest({
        filters: { post: post._id },
      });
      const found = await Post.find({
        parent: post._id,
      }).sort("-createdAt");

      expect(found.length).toEqual(comments.length);
      expect(found[0]._id.toString()).toEqual(comments[0]._id.toString());
    });

    it("should find posts by communities if the communities filter is active", async () => {
      const community1Post = await Post.create({
        account: account._id,
        community: community1._id,
      });
      // sleep for 1 second to ensure the next post is created after
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const community2Post = await Post.create({
        account: account._id,
        community: community2._id,
      });
      const posts = await Post.findAndSortByLatest({
        filters: { communities: [community1._id, community2._id] },
      });

      expect(posts.length).toEqual(2);
      expect(posts[0]._id.toString()).toEqual(community2Post._id.toString());
      expect(posts[1]._id.toString()).toEqual(community1Post._id.toString());
    });

    it("should find all posts by latest createdAt if no filters", async () => {
      const justCreatedThisPost = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisPost",
      });
      const justCreatedThisComment = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisComment",
        parentId: justCreatedThisPost._id,
      });
      const posts = await Post.findAndSortByLatest();

      expect(posts[0]._id.toString()).toEqual(
        justCreatedThisComment._id.toString()
      );
      expect(posts[1]._id.toString()).toEqual(
        justCreatedThisPost._id.toString()
      );
    });
  });

  describe("findAndSortByLastActivity", () => {
    it("should find all posts by latest replies", async () => {
      const newPost = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisPost",
      });
      const newestPost = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisPost",
      });
      const commentForNewestPost = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisComment",
        parentId: newestPost._id,
      });
      const commentForNewPost = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisComment",
        parentId: newPost._id,
      });
      const shouldBeTheLastPost = await Post.createForAccount({
        accountId: account._id,
        contentRaw: "justCreatedThisPost",
      });

      const posts = await Post.findAndSortByLastActivity({
        filters: {
          excludeComments: true,
        },
      });

      expect(posts[0]._id.toString()).toEqual(
        shouldBeTheLastPost._id.toString()
      );
      expect(posts[1]._id.toString()).toEqual(newPost._id.toString());
      expect(posts[2]._id.toString()).toEqual(newestPost._id.toString());
      expect(commentForNewPost.root.toString()).toEqual(newPost._id.toString());
      expect(commentForNewestPost.root.toString()).toEqual(
        newestPost._id.toString()
      );
    });
  });
});
