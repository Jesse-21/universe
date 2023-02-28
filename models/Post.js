const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/post");

const { Service: ContentService } = require("../services/ContentService");

class PostClass {
  static ping() {
    console.log("model: PostClass");
  }

  /**
   * Build post feed query for PostFilter
   */
  static _buildPostFeedMatchQuery({ filters }) {
    let matchQuery = {};
    if (!filters.showHidden) {
      matchQuery.isHidden = false;
    }
    if (filters.excludeComments) {
      matchQuery = {
        ...matchQuery,
        parent: null,
      };
    }
    if (filters.excludeChannels) {
      matchQuery = {
        ...matchQuery,
        channel: null,
      };
    }
    if (filters.account) {
      matchQuery = {
        ...matchQuery,
        account: mongoose.Types.ObjectId(filters.account),
      };
    }
    if (filters.post) {
      matchQuery = {
        ...matchQuery,
        parent: mongoose.Types.ObjectId(filters.post),
      };
    }
    if (filters.channel) {
      matchQuery = {
        ...matchQuery,
        channel: mongoose.Types.ObjectId(filters.channel),
      };
    }
    if (filters.community) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.community),
      };
    }

    if (filters.communities && filters.communities.length) {
      matchQuery = {
        ...matchQuery,
        community: {
          $in: filters.communities.map((c) => mongoose.Types.ObjectId(c)),
        },
      };
    }
    return matchQuery;
  }
  /**
   * Get the parent post or error
   * @returns Promise<Post>
   */
  static async _getParentOrError(parentId) {
    const parent = await this.findById(parentId);
    if (!parent) throw new Error("Invalid parent id");
    return parent;
  }

  /**
   * Update the parent post replies array with postId
   * @returns Promise<Post>
   */
  static async _verifyAndUpdateParentReplies({ parentId, postId }) {
    const parent = await this.findById(parentId);
    if (!parent) throw new Error("Invalid parent id");
    parent.replies.push(postId);
    return parent.save();
  }

  /**
   * Create a new post or comment for account Id
   * @returns Promise<Post>
   */
  static async createForAccount({
    parentId,
    accountId,
    channelId,
    externalId,
    communityId,
    contentRaw,
    contentJson,
    contentHtml,
    blocks,
  }) {
    const richContent = await new ContentService().makeRichContent({
      contentRaw,
      contentJson,
      contentHtml,
      blocks,
    });
    const post = new Post({
      account: accountId,
      community: communityId,
      channel: channelId,
      externalId,
      richContent,
    });
    /** Inject post id into parent replies array if exist */
    /** if parent then post's community is parent's community */
    /** if parent then post's root is parent's root, or is the parent itself */
    if (parentId) {
      const parent = await this._verifyAndUpdateParentReplies({
        parentId,
        postId: post._id,
      });
      post.parent = parent._id;
      post.root = parent.root || parent._id;
      post.community = parent.community || null;
      post.channel = parent.channel || null;
    }

    return post.save();
  }

  /**
   * Count comments by post id
   * @returns Promise<Int>
   */
  static async countComments(postId) {
    return this.countDocuments({
      parent: postId,
    });
  }
  /**
   * Find Posts ordered by createdAt desc
   * @returns Promise<Posts[]>
   */
  static async findAndSortByLatest({
    limit = 20,
    offset = 0,
    filters = {},
  } = {}) {
    let matchQuery = this._buildPostFeedMatchQuery({ filters });

    const posts = await Post.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return posts;
  }
  /**
   * Find Posts ordered by most recent comment
   * @returns Promise<Posts[]>
   */
  static async findAndSortByLastActivity({
    limit = 20,
    offset = 0,
    filters = {},
  } = {}) {
    let matchQuery = this._buildPostFeedMatchQuery({ filters });

    const posts = await Post.aggregate([
      { $match: matchQuery },
      // sort by last created replies
      { $sort: { updatedAt: -1, _id: 1 } },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return posts;
  }

  static async findAndSort({
    limit = 20,
    offset = 0,
    filters = {},
    sort = "latest",
  } = {}) {
    switch (sort) {
      case "lastActivity":
        return this.findAndSortByLastActivity({
          limit,
          offset,
          filters,
        });
      // default case is "latest"
      default:
        return this.findAndSortByLatest({
          limit,
          offset,
          filters,
        });
    }
  }
}

schema.loadClass(PostClass);

const Post = mongoose.models.Post || mongoose.model("Post", schema);

module.exports = {
  Post,
};
