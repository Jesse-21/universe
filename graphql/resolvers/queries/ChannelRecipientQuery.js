const {
  Service: _AccountService,
} = require("../../../services/AccountService");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const resolvers = {
  ChannelRecipientQuery: {
    _id: (root, args, context) => {
      return context.accountId;
    },
    /** Get ChannelRecipient[] for current account */
    getAccountChannelRecipients: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return [];
      try {
        const AccountService = new _AccountService();
        return await AccountService.getChannelRecipientsByRolesAndAccount(
          auth.account,
          {
            ...args,
          }
        );
      } catch (e) {
        throw new Error(e);
      }
    },
  },
};

module.exports = { resolvers };
