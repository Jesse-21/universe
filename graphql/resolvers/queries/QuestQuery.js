const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const { Quest } = require("../../../models/quests/Quest");
const { Community } = require("../../../models/Community");

const { getMemcachedClient, getHash } = require("../../../connectmemcached");

const resolvers = {
  QuestQuery: {
    getQuests: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      const argsKey = JSON.stringify(args);

      const memcached = getMemcachedClient();
      try {
        const data = await memcached.get(
          getHash(`QuestQuery:getQuests:${argsKey}`)
        );
        if (data) {
          return JSON.parse(data.value).map((d) => new Quest(d));
        }
      } catch (e) {
        console.error(e);
      }

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

      const data = await Quest.findAndSort({
        limit: args.limit,
        offset: args.offset,
        sort: args.sort,
        filters: args.filters,
      });
      try {
        await memcached.set(
          getHash(`QuestQuery:getQuests:${argsKey}`),
          JSON.stringify(data),
          {
            lifetime: 60 * 60, // 1 hour cache
          }
        );
      } catch (e) {
        console.error(e);
      }
      return data;
    },
  },
};

module.exports = { resolvers };
