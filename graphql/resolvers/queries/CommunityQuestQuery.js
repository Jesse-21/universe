const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 250;
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: CommunityQuestService,
} = require("../../../services/CommunityQuestService");
const { CommunityQuest } = require("../../../models/quests/CommunityQuest");

const resolvers = {
  CommunityQuestQuery: {
    getCommunityQuestStatus: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      await unauthorizedErrorOrAccount(root, args, context);

      const communityQuest = await CommunityQuest.findOrCreate({
        communityId: args.communityId,
        questId: args.questId,
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
    getCommunityQuest: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      await unauthorizedErrorOrAccount(root, args, context);

      const communityQuest = await CommunityQuest.findOrCreate({
        communityId: args.communityId,
        questId: args.questId,
      });
      return communityQuest;
    },
  },
};

module.exports = { resolvers };
