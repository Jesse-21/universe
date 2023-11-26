const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  Service: _AccountService,
} = require("../../../services/AccountService");
const { Channel } = require("../../../models/Channel");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const resolvers = {
  ChannelQuery: {
    _id: (root, args, context) => {
      return context.accountId;
    },
    getChannelById: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      try {
        const channel = await Channel.findById(args.id);
        return channel;
      } catch (e) {
        throw new Error(e);
      }
    },
    /** Get ChannelRecipient[] for current account */
    getAccountChannels: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return [];
      try {
        const AccountService = new _AccountService();
        return await AccountService.getChannelsByRolesAndAccount(auth.account, {
          ...args,
        });
      } catch (e) {
        throw new Error(e);
      }
    },
  },
};

module.exports = { resolvers };
