const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const { CommunityAsset } = require("../../../models/assets/CommunityAsset");

const resolvers = {
  CommunityAssetQuery: {
    /** Get Community Assets by Community id */
    getCommunityAssets: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      return await CommunityAsset.findAndSort({
        filters: args.filters,
        limit: args.limit,
        offset: args.offset,
        sort: args.sort,
      });
    },
  },
};

module.exports = { resolvers };
