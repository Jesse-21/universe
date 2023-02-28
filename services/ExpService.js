const { AccountExp } = require("../models/AccountExp");
const { Post } = require("../models/Post");

class ExpService {
  /** exp awarded to 'recipient' when 'account' react to a 'recipient' post */
  getPostReactedToExpCount(accountReaction) {
    if (accountReaction?.reactions?.likes) {
      return accountReaction?.reactions?.likes;
    }
    return 0;
  }
  /** exp awarded to 'account' when 'account' reply to a 'recipient' post */
  getPostReplyExpCount() {
    return 5;
  }
  /** exp awarded to 'recipient' when 'account' reply to a 'recipient' post */
  getPostRepliedToExpCount() {
    return 5;
  }
  /** exp awarded to 'account' when 'account' create a post */
  getPostCreatedExpCount() {
    return 10;
  }
  /** exp awarded to 'recipient' when 'account' follow 'recipient' */
  getFollowedByExpCount() {
    return 10;
  }

  /** Triggered after a createPostOrReplyForAccount mutation by currentAccount */
  async awardPostOrReplyExp(_, { post }, context) {
    if (!post) {
      return null;
    }
    // 1. award exp to parent account
    const parent = await Post.findById(post?.parent).select("account");
    if (parent) {
      const parentAccountExp = await AccountExp.findOne({
        account: parent.account,
      });
      if (parentAccountExp) {
        parentAccountExp.exp += this.getPostRepliedToExpCount();
        await parentAccountExp.save();
      }
    }

    // 2. award exp to post creator
    const currentAccountExp = await AccountExp.findOne({
      account: context.accountId,
    });
    if (currentAccountExp) {
      const increase = parent
        ? this.getPostReplyExpCount()
        : this.getPostCreatedExpCount();
      currentAccountExp.exp += increase;
      await currentAccountExp.save();
    }

    return currentAccountExp;
  }

  /** Triggered after a reactForPost mutation by currentAccount */
  async awardReactionExp(_, { post, accountReaction }, context) {
    if (
      !post ||
      !post.account ||
      !accountReaction ||
      !accountReaction?.reactions?.likes
    ) {
      return null;
    }

    // 0. check if is a new reaction
    if (
      new Date(accountReaction.createdAt) -
        new Date(accountReaction.updatedAt) <
      -100
    ) {
      return null;
    }
    // 0.1 check if post.account is currentAccount
    if (post.account.toString() === context.accountId.toString()) {
      return null;
    }

    // 1. award exp to post account
    const creatorAccountExp = await AccountExp.findOne({
      account: post.account,
    });
    if (creatorAccountExp) {
      creatorAccountExp.exp += this.getPostReactedToExpCount(accountReaction);
      await creatorAccountExp.save();
    }

    return creatorAccountExp;
  }

  /** Triggered after a toggleFollow mutation by currentAccount */
  async awardRelationshipExp(_, { relationship }) {
    if (!relationship || !relationship?.isFollowing) return;

    // 1. award exp to followed account
    const followedAccountExp = await AccountExp.findOne({
      account: relationship.to,
    });
    if (followedAccountExp) {
      followedAccountExp.exp += this.getFollowedByExpCount();
      await followedAccountExp.save();
    }

    return followedAccountExp;
  }
}

module.exports = { Service: ExpService };
