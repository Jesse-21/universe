const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const { Community } = require("../../../models/Community");

const { SearchService } = require("../../../services");

const resolvers = {
  CommunityQuery: {
    _id: () => "CommunityQuery",
    /** Get Community for bebdomain or tokenId in the registry */
    getCommunityByDomainOrTokenId: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      if (!args.bebdomain && !args.tokenId)
        throw new Error("Missing bebdomain or tokenId");
      let tld = args.tld || "beb";
      if (args.bebdomain) {
        const community = await Community.findOne({
          bebdomain: args.bebdomain,
          tld,
        });
        if (!community)
          return {
            bebdomain: args.bebdomain,
            tld,
          };
        return community;
      }
      /** @TODO change to use tokenId in the registry instead */
      return await context.dataloaders.communities.load(args.tokenId);
    },

    /** Get Community by id */
    getCommunityById: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      return await Community.findById(args.id);
    },

    /** Search Community by domain */
    searchCommunityByDomainOrName: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      return await SearchService.searchCommunityByDomainOrName(args.query);
    },
  },
};

module.exports = { resolvers };
