const get = require("lodash/get");
const { AccountReaction } = require("../../models/AccountReaction");
const { Post } = require("../../models/Post");

const {
  Service: _PostQueryService,
} = require("../../services/queryServices/PostQueryService");

const { unauthorizedErrorOrAccount } = require("../../helpers/auth-middleware");

const PostQueryService = new _PostQueryService();
const resolvers = {
  Post: {
    rootCommentCount: async (parent) => {
      const count = await Post.countDocuments({
        root: get(parent, "_id"),
      });
      return count;
    },
    commentCount: async (parent) => {
      if (!parent.replies?.length) return 0;
      return parent.replies?.length;
    },
    reactionCount: async (parent) => {
      const reactionCount = await AccountReaction.countReactionsByPostId(
        get(parent, "_id")
      );
      return reactionCount;
    },
    replies: async (parent, args) => {
      if (!parent.replies?.length) return [];
      const replies = await Post.findAndSort({
        filters: {
          post: get(parent, "_id"),
          showHidden: true,
        },
        ...args,
      });
      return replies;
    },
    parent: async (post, _args, context) => {
      if (!post.parent) return null;
      return await context.dataloaders.posts.load(post.parent);
    },
    account: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.account);
      return account;
    },
    community: async (parent, _args, context) => {
      const community = await context.dataloaders.communities.load(
        parent.community
      );
      return community;
    },
    channel: async (parent, _args, context) => {
      if (!parent.channel) return null;
      const channel = await context.dataloaders.channels.load(parent.channel);
      return channel;
    },
    richContent: async (post, args, context) => {
      return await PostQueryService.richContent(post, args, context);
    },
    currentAccountPermissions: async (parent, _args, context) => {
      return {
        _id: () => parent._id,
        canHide: async () => {
          const auth = await unauthorizedErrorOrAccount(parent, _args, context);
          if (!auth.account) return false;
          return await PostQueryService.canHide(parent, _args, context);
        },
        canRead: async () => {
          return await PostQueryService.canRead(parent, _args, context);
        },
      };
    },
  },
};

module.exports = { resolvers };
