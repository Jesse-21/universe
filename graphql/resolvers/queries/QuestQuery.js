const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 250;

const { Quest } = require("../../../models/quests/Quest");

const resolvers = {
  QuestQuery: {
    getQuests: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      return await Quest.findAndSort({
        limit: args.limit,
        offset: args.offset,
        sort: args.sort,
      });
    },
  },
};

module.exports = { resolvers };
