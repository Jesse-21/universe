const Sentry = require("@sentry/node");

const { Service: _AccountService } = require("./AccountService");
const { Service: _ContentSerice } = require("./ContentService");
const { Service: _CommunityService } = require("./CommunityService");
const { Service: _CacheService } = require("./cache/CacheService");

const { Post } = require("../models/Post");
const { Community } = require("../models/Community");
const { Channel } = require("../models/Channel");
const { AccountCommunity } = require("../models/AccountCommunity");

class PostService {
  /**
   * Make a partial Post with given data and verification of the community and channel
   * @returns Promise<Post[]> post and parent
   */
  async _makePost(
    _,
    {
      parentId,
      channelId,
      externalId,
      communityId,
      contentRaw,
      contentJson,
      contentHtml,
      blocks,
    },
    context
  ) {
    const ContentService = new _ContentSerice();
    const richContent = await ContentService.makeRichContent({
      contentRaw,
      contentJson,
      contentHtml,
      blocks,
    });
    const post = new Post({
      account: context.account?._id || context.accountId,
      community: communityId,
      channel: channelId,
      externalId,
      richContent,
    });

    let parent;
    // 1. if parent then post's community is parent's community
    if (parentId) {
      parent = await Post._getParentOrError(parentId);
      post.parent = parent._id;
      post.root = parent.root || parent._id; // if parent then post's root is parent's root, or is the parent itself
      post.community = parent.community || null;
      post.channel = parent.channel || null;
    }
    // 2. if channel then post's community is channel's community
    if (post.channel) {
      const channel = await Channel.findById(post.channel);
      if (!channel) throw new Error("Invalid channel");
      post.community = channel.community;
    }

    return [post, parent];
  }
  /**
   * Verify if an Account can have delete permission like hide in the community and channel
   * @returns Promise<Boolean>
   * */
  async canHide(post, args, context) {
    if (!post?.account || !context.account) return false;
    const accountId = context.account._id;

    const isPostOnwer = accountId.toString() === post.account.toString();
    if (isPostOnwer) return true;

    const CommunityService = new _CommunityService();
    const community = await Community.findById(post.community);
    const hasAdminPermissionForCommunity = await CommunityService.canAdmin(
      community,
      args,
      context
    );
    if (hasAdminPermissionForCommunity) return true;

    if (
      process.env.GLOBAL_MODERATOR_ID &&
      accountId.toString() === process.env.GLOBAL_MODERATOR_ID
    ) {
      return true;
    }

    return false;
  }
  /**
   * Verify if an Account can post in the community
   * @returns Promise<Boolean>
   * */
  async canPost(_, { communityId, channelId }, context) {
    if (!communityId || !context.account) return false;
    const cachedId = `${communityId}${channelId || ""}`;

    if (context.communities?.[cachedId]?.canWrite !== undefined)
      return context.communities?.[cachedId]?.canWrite;
    const AccountService = new _AccountService();
    try {
      const canWrite = await AccountService.validPermissionForAccount(
        context.account,
        {
          communityId,
          channelId,
          permissionIdentifier: "WRITE",
        },
        context
      );
      context.communities = {
        ...context.communities,
        [cachedId]: {
          canWrite,
        },
      };
      return canWrite;
    } catch (e) {
      console.log(e);
      Sentry.captureException(e);
      return false;
    }
  }
  /**
   * Verify if an Account can read a post
   * @returns Promise<Boolean>
   * */
  async canRead(post, args, context) {
    const communityId = post?.community || args?.communityId;
    const channelId = post?.channel || args?.channelId;
    const cachedId = `${communityId}${channelId || ""}`;

    if (!communityId) return false;
    if (context.communities?.[cachedId]?.canRead !== undefined)
      return context.communities?.[cachedId]?.canRead;
    try {
      const AccountService = new _AccountService();
      const canRead = await AccountService.validPermissionForAccount(
        context.account || { _id: context.accountId },
        {
          communityId,
          channelId,
          permissionIdentifier: "READ",
        },
        context
      );
      context.communities = {
        ...context.communities,
        [cachedId]: {
          canRead,
        },
      };
      return canRead;
    } catch (e) {
      console.log(e);
      Sentry.captureException(e);
      return false;
    }
  }
  /**
   * Get all communities 1.joined by account 2.that accounts can read
   * @TODO add channel
   * @returns Promise<Communities[]>
   * */
  async getExplorePostFeedCommunityIds(_, __, context) {
    /** 1. Get all joined communities by account */
    const accountCommunities = await AccountCommunity.find({
      account: context.accountId || context.account?._id,
      joined: true,
    });
    const communityIds = accountCommunities.map(
      (accountCommunity) => accountCommunity.community
    );

    /** 2. Filter by community the account can access @TODO add channels */
    const canReads = await Promise.all(
      communityIds.map(async (communityId) => {
        const canRead = await this.canRead(_, { communityId }, context);
        return canRead;
      })
    );
    const allowedCommunityIds = communityIds.filter((_, index) => {
      return canReads[index];
    });

    return allowedCommunityIds;
  }

  /**
   * Get all posts that accounts can read
   * @TODO add channel
   * @returns Promise<Post[]>
   * */
  async getExplorePostFeed(_, { filters = {}, ...args }, context) {
    const getCommunityIds = async () =>
      await this.getExplorePostFeedCommunityIds(
        _,
        {
          filters,
          ...args,
        },
        context
      );

    const CacheService = new _CacheService();
    const communityIds = await CacheService.getOrCallbackAndSet(
      getCommunityIds,
      {
        key: "ExploreFeedCommunities",
        params: {
          accountId: context.accountId || context.account?._id,
        },
        expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 mins from now
      }
    );

    return Post.findAndSort({
      ...args,
      filters: { ...filters, communities: communityIds, excludeChannels: true }, // @TODO better algo, no channels for now
    });
  }

  /**
   * Get all posts
   * @returns Promise<Boolean>
   * */
  async getPostFeed(_, { filters = {}, ...args }, context) {
    if (filters.explore) {
      return this.getExplorePostFeed(_, { filters, ...args }, context);
    } else {
      return Post.findAndSort({
        ...args,
        filters,
      });
    }
  }

  /**
   * Create a new post or comment for account Id if authorized
   * @returns Promise<Post>
   */
  async createPostOrUnauthorized(_, args, context) {
    const [post, parent] = await this._makePost(null, args, context);
    const canPost = await this.canPost(
      _,
      { communityId: post.community, channelId: post.channel },
      context
    );

    if (!canPost) {
      throw new Error("You do not have permission to post in the community.");
    }
    // 1.1. If post has channel update channel lastPost (no need to await)
    if (post.channel) {
      Channel.updateLastPost({ channelId: post.channel, postId: post._id });
    }

    // 2. if no parent then this is root post
    if (!parent) return await post.save();

    // 3. update root updatedAt if exist
    if (post.root.toString() === parent._id.toString()) {
      parent.updatedAt = new Date();
    } else {
      await Post.updateOne(
        {
          _id: post.root,
        },
        {
          updatedAt: new Date(),
        }
      );
    }

    // 4. Do saves: save to parent replies array and save post
    parent.replies.push(post._id);
    const promises = await Promise.all([post.save(), parent.save()]);
    return promises[0];
  }

  /**
   * Hide a post or comment for account Id if authorized
   * @returns Promise<Post>
   */
  async hidePostOrUnauthorized(_, { postId }, context) {
    const post = await Post.findById(postId);
    const canHide = await this.canHide(post, { postId }, context);
    if (!canHide) {
      throw new Error("You do not have permission to hide in the community.");
    }
    post.isHidden = true;
    return post.save();
  }
}

module.exports = { Service: PostService };
