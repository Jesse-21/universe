const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: CommunityQuestService,
} = require("../../../services/CommunityQuestService");

const { Community } = require("../../../models/Community");
const { Quest } = require("../../../models/quests/Quest");

const resolvers = {
  CommunityQuest: {
    status: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      await unauthorizedErrorOrAccount(root, args, context);

      const status = await new CommunityQuestService().getQuestStatus(
        root,
        args,
        context
      );

      return status;
    },
    community: async (parent) => {
      return await Community.findById(parent.community);
    },
    quest: async (parent) => {
      return await Quest.findById(parent.quest);
    },
    completedCount: (parent) => {
      return parent.accounts?.length || 0;
    },
  },
};

module.exports = { resolvers };
