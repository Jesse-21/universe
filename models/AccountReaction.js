const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/accountReaction");
const { Post } = require("./Post");

class AccountReactionClass {
  static ping() {
    console.log("model: AccountReaction");
  }

  /**
   * Get default reaction object
   * @returns Reaction
   */
  static _getDefaultReactions() {
    return {
      likes: 0,
    };
  }
  /**
   * Find or create account reaction
   * @returns Promise<AccountReaction>
   */
  static async _findOrCreateAccountReaction({
    accountId,
    reactionObjectTypeId,
    reactionObjectType,
  }) {
    let accountPostReaction = await this.findOne({
      account: accountId,
      reactionObjectTypeId,
      reactionObjectType,
    });
    if (!accountPostReaction) {
      accountPostReaction = await this.create({
        account: accountId,
        reactionObjectTypeId,
        reactionObjectType,
        reactions: this._getDefaultReactions(),
      });
    }
    return accountPostReaction;
  }

  /**
   * Find reactions filtered by post id
   * @returns Promise<Int>
   * @TODO count other reaction type i.e reactions.like === 1 or reactions.haha === 1
   */
  static async countReactionsByPostId(postId) {
    const likes = await this.find({
      reactionObjectTypeId: postId,
      reactionObjectType: "POST",
    });
    return likes.reduce((acc, curr) => {
      return acc + curr.reactions.likes;
    }, 1);
  }

  /**
   * Find reactions by post id
   * @returns Promise<AccountReaction[]>
   */
  static async findReactionsByPostId(postId, { limit = 20, offset = 0 } = {}) {
    return this.find({
      reactionObjectTypeId: postId,
      reactionObjectType: "POST",
    })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10));
  }

  /**
   * Find reaction by account id
   * @returns Promise<AccountReaction>
   */
  static async findReactionByAccountAndObjectId({
    accountId,
    reactionObjectType,
    reactionObjectTypeId,
  }) {
    return this.findOne({
      reactionObjectTypeId,
      reactionObjectType,
      account: accountId,
    });
  }

  /**
   * Increase the reaction for a post
   * @returns Promise<[Post, AccountReaction]>
   */
  static async reactForPost({ postId, accountId, reactionType, amount }) {
    // @TODO verify account
    const post = await Post.findById(postId);
    if (!post) throw new Error(`Invalid post id: ${postId}`);
    if (Math.abs(amount) > 1) throw new Error(`Invalid amount: ${amount}`);

    const accountPostReaction = await this._findOrCreateAccountReaction({
      accountId,
      reactionObjectTypeId: postId,
      reactionObjectType: "POST",
    });

    if (reactionType === "LIKES") {
      accountPostReaction.reactions.likes = amount;
      await accountPostReaction.save();
    }

    return [post, accountPostReaction];
  }
}

schema.loadClass(AccountReactionClass);

const AccountReaction =
  mongoose.models.AccountReaction || mongoose.model("AccountReaction", schema);

module.exports = {
  AccountReaction,
};
