const { AccountChannel } = require("../../../models/AccountChannel");

const { signedInAccountIdOrNull } = require("../../../helpers/auth-middleware");
const Sentry = require("@sentry/node");

const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    updateAccountChannelLastSeen: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const accountId = signedInAccountIdOrNull(context);
        if (!accountId)
          return {
            code: "403",
            success: false,
            message: "Unauthorized",
          };
        const accountChannel =
          await AccountChannel.updateAccountChannelLastSeen({
            accountId: accountId,
            ...args,
          });

        return {
          code: "200",
          success: true,
          message: "Successfully updated account channel",
          accountChannel,
        };
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
        return {
          code: "500",
          success: false,
          message: e.message,
        };
      }
    },
  },
};

module.exports = { resolvers };
