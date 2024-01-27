const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { AccountReaction } = require("../../../models/AccountReaction");

const { NotificationService, ExpService } = require("../../../services");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    reactForPost: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const [post, accountReaction] = await AccountReaction.reactForPost({
          accountId: auth.account._id,
          ...args,
          amount: !args.amount ? 0 : args.amount === -1 ? -1 : 1,
        });
        NotificationService.reactForPostNotification(
          root,
          { post, accountReaction },
          context
        );
        ExpService.awardReactionExp(root, { post, accountReaction }, context);

        return {
          code: "201",
          success: true,
          message: "Successfully created post",
          post,
          accountReaction,
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
