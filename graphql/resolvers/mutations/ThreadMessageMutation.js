const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { ThreadMessage } = require("../../../models/ThreadMessage");
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const { NotificationService } = require("../../../services");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    createThreadMessage: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const threadMessage = await ThreadMessage.createForThread({
          senderId: auth.account._id,
          ...args,
        });
        NotificationService.createThreadMessageNotification(
          root,
          { threadMessage },
          context
        );
        return {
          code: "201",
          success: true,
          message: "Successfully created thread message",
          threadMessage,
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
