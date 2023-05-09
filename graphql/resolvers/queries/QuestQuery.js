const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 250;

const { Quest } = require("../../../models/quests/Quest");
const { Community } = require("../../../models/Community");

const resolvers = {
  QuestQuery: {
    getQuests: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      if (args.filters?.domains?.length) {
        const communityIds = await Community.find({
          bebdomain: { $in: args.filters.domains },
        }).select("_id");
        args.filters.communities = communityIds.map((c) => c._id);
      }
      if (args.filters?.domain) {
        const community = await Community.findOne({
          bebdomain: args.filters.domain,
        }).select("_id");
        args.filters.community = community?._id;
      }

      return await Quest.findAndSort({
        limit: args.limit,
        offset: args.offset,
        sort: args.sort,
        filters: args.filters,
      });
    },
  },
};

module.exports = { resolvers };
