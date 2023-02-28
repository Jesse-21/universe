const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  Service: _CommunityQuestMutationService,
} = require("../../../services/mutationServices/CommunityQuestMutationService");
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 50;

const resolvers = {
  Mutation: {
    completeQuest: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const CommunityQuestMutationService =
          new _CommunityQuestMutationService();

        const communityQuest =
          await CommunityQuestMutationService.completeQuest(
            root,
            {
              communityId: args.communityId,
              questId: args.questId,
            },
            context
          );
        return {
          communityQuest,
          code: "201",
          success: true,
          message: "Successfully completed quest",
        };
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
        return {
          code: "500",
          success: false,
          message: e.message,
        };
      }
    },

    claimReward: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const CommunityQuestMutationService =
          new _CommunityQuestMutationService();

        const { communityQuest, communityAssets } =
          await CommunityQuestMutationService.claimRewardOrError(
            root,
            {
              communityId: args.communityId,
              questId: args.questId,
            },
            context
          );
        return {
          communityQuest,
          communityAssets,
          code: "201",
          success: true,
          message: "Successfully claimed quest reward",
        };
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
        return {
          code: "500",
          success: false,
          message: e.message,
        };
      }
    },
  },
};

module.exports = { resolvers };
