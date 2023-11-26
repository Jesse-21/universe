const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { Account } = require("../../models/Account");
const { Thread } = require("../../models/Thread");
const { AccountReaction } = require("../../models/AccountReaction");
const { AccountRelationship } = require("../../models/AccountRelationship");
const { Notification } = require("../../models/Notification");
const { Community } = require("../../models/Community");

const { AccountService, PostService } = require("../../services");
const {
  Service: FarcasterServiceV2,
} = require("../../services/identities/FarcasterServiceV2");
const { Service: _ScoreService } = require("../../services/ScoreService");

const {
  resolvers: NotificationQueryResolvers,
} = require("./queries/NotificationQuery");
const { resolvers: SearchQueryResolvers } = require("./queries/SearchQuery");
const {
  resolvers: CommunityQueryResolvers,
} = require("./queries/CommunityQuery");
const { resolvers: RoleQueryResolvers } = require("./queries/RoleQuery");
const { resolvers: AccountQueryResolvers } = require("./queries/AccountQuery");
const { resolvers: QuestQueryResolvers } = require("./queries/QuestQuery");
const {
  resolvers: ChannelRecipientQueryResolvers,
} = require("./queries/ChannelRecipientQuery");
const { resolvers: ChannelQueryResolvers } = require("./queries/ChannelQuery");
const {
  resolvers: CommunityQuestQueryResolvers,
} = require("./queries/CommunityQuestQuery");
const {
  resolvers: CommunityAssetQueryResolvers,
} = require("./queries/CommunityAssetQuery");

const { AccessControlService } = require("../../services");

const { unauthorizedErrorOrAccount } = require("../../helpers/auth-middleware");
const {
  getAddressFromEnsOrAddress,
} = require("../../helpers/get-address-from-ens");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Query: {
    /** Get public fields for account */
    findAccountByAddressAndChain: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const address = await getAddressFromEnsOrAddress(args.address);
      const account = await Account.findByAddressAndChainId({
        address,
        chainId: args.chainId,
      });
      if (account?.deleted) return null;
      return account;
    },
    /** Get public fields for account */
    findAccountByFarcasterUsername: async (root, args, context, info) => {
      const FarcasterService = new FarcasterServiceV2();
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const farcaster = await FarcasterService.getProfileByUsername(
        args.username
      );
      if (!farcaster) return null;
      return await Account.findByAddressAndChainId({
        address: farcaster.address,
        chainId: 1,
      });
    },
    /** Get private fields for account */
    getCurrentAccount: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return null;
      return auth.account;
    },
    /** Get roles for account in a community. Can be unauthenticated. */
    getCurrentAccountAvailableRoles: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      return AccountService.refreshRoles(auth.account, {
        commnumunityId: args.communityId,
      });
    },
    /** Get thread by threadId and current user account id */
    getThread: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return null;
      const hasAccess =
        await AccessControlService.accountThreadByThreadIdControl(
          root,
          args,
          context
        );
      if (!hasAccess) return null;
      return Thread.findOne({ _id: args.threadId });
    },
    /** Get Post[] or a single post with comments sort by latest created */
    getPostFeed: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const posts = await PostService.getPostFeed(root, args, context);
      return posts;
    },
    /** Get Post by id */
    getPost: async (root, args, context, info) => {
      const { id } = args;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return await context.dataloaders.posts.load(id);
    },
    /** Get AccountReaction[] for post id */
    getReactionsByPostId: async (root, args, context, info) => {
      const { postId, ...pagination } = args;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const reactions = await AccountReaction.findReactionsByPostId(
        postId,
        pagination
      );
      return reactions;
    },
    /** Get AccountRelationships */
    getAccountRelationships: async (root, args = {}, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const relationships = await AccountRelationship.getAccountRelationships(
        args
      );
      return relationships;
    },
    /** Get AccountReaction for object type id and current account id */
    getReactionByAccountAndObjectId: async (root, args = {}, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return null;
      return AccountReaction.findReactionByAccountAndObjectId({
        accountId: auth.account._id,
        ...args,
      });
    },
    /** Get Notification[] for current account */
    getAccountNotifications: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return null;
      return Notification.find({
        receiver: auth.account._id,
        initiator: { $ne: auth.account._id },
      })
        .sort("-createdAt")
        .limit(20);
    },
    getCommunities: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return Community.findAndSort(args);
    },
    getCommunityAddressScore: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const ScoreService = new _ScoreService();
      return await ScoreService.getCommunityScore({
        address: args.address,
        bebdomain: args.bebdomain,
      });
    },
    NotificationQuery: () => {
      return NotificationQueryResolvers;
    },
    SearchQuery: () => {
      return SearchQueryResolvers;
    },
    CommunityQuery: () => {
      return CommunityQueryResolvers;
    },
    RoleQuery: () => {
      return RoleQueryResolvers;
    },
    AccountQuery: () => {
      return AccountQueryResolvers;
    },
    QuestQuery: () => {
      return QuestQueryResolvers;
    },
    CommunityAssetQuery: () => {
      return CommunityAssetQueryResolvers;
    },
    CommunityQuestQuery: () => {
      return CommunityQuestQueryResolvers;
    },
    ChannelRecipientQuery: () => {
      return ChannelRecipientQueryResolvers;
    },
    ChannelQuery: () => {
      return ChannelQueryResolvers;
    },
  },
};

module.exports = { resolvers };
