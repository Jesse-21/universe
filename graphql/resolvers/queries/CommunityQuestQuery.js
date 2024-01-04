const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: CommunityQuestService,
} = require("../../../services/CommunityQuestService");
const { CommunityQuest } = require("../../../models/quests/CommunityQuest");
const { Account } = require("../../../models/Account");
const { CommunityReward } = require("../../../models/quests/CommunityReward");
const { Score } = require("../../../models/Score");

const resolvers = {
  CommunityQuestQuery: {
    getCommunityQuestStatus: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      await unauthorizedErrorOrAccount(root, args, context);

      const communityQuest = await CommunityQuest.findOne({
        community: args.communityId,
        quest: args.questId,
      });
      return await new CommunityQuestService().getQuestStatus(
        communityQuest,
        {
          communityId: args.communityId,
          questId: args.questId,
        },
        context
      );
    },
    getLeaderboard: async (_, { communityId, limit }) => {
      return await Score.getLeaderboard(communityId, limit);
    },
    checkIfCommunityQuestClaimedByAddress: async (
      root,
      args,
      context,
      info
    ) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const account = await Account.findByAddressAndChainId({
        address: args.address,
        chainId: 1,
      });
      if (!account) return false;

      const communityQuest = await CommunityQuest.findOne({
        community: args.communityId,
        quest: args.questId,
      });

      return await new CommunityQuestService().checkIfCommunityQuestClaimedByAddress(
        communityQuest,
        {
          communityId: args.communityId,
          questId: args.questId,
        },
        { ...context, account }
      );
    },
    getCommunityQuestStatusByAddress: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const account = await Account.findOrCreateByAddressAndChainId({
        address: args.address,
        chainId: 1,
      });

      const communityQuest = await CommunityQuest.findOne({
        community: args.communityId,
        quest: args.questId,
      });
      return await new CommunityQuestService().getQuestStatus(
        communityQuest,
        {
          communityId: args.communityId,
          questId: args.questId,
        },
        { ...context, account }
      );
    },
    getCommunityQuest: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      await unauthorizedErrorOrAccount(root, args, context);

      const communityQuest = await CommunityQuest.findOne({
        community: args.communityId,
        quest: args.questId,
      });
      return communityQuest;
    },
    getCommunityRewards: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      const communityRewards = await CommunityReward.findAndSort({
        limit: args.limit,
        offset: args.offset,
        filters: {
          community: args.communityId,
        },
      });
      return communityRewards;
    },
  },
};

module.exports = { resolvers };
