const { SearchService } = require("../../../services");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const resolvers = {
  SearchQuery: {
    /** Get Account by search query */
    searchAccountByUsernameOrAddressOrEns: async (
      root,
      args = {},
      context,
      info
    ) => {
      const { query } = args;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return await SearchService.searchAccountByUsernameOrAddressOrENS(query);
    },
  },
};

module.exports = { resolvers };
