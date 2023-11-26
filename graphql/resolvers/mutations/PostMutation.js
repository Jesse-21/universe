const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const { NotificationService, PostService } = require("../../../services");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    hidePost: async (root, args, context, info) => {
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const postOrReply = await PostService.hidePostOrUnauthorized(
          root,
          args,
          context
        );

        return {
          code: "201",
          success: true,
          message: "Successfully hide post",
          post: postOrReply,
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
    createPostOrReplyForAccount: async (root, args, context, info) => {
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const postOrReply = await PostService.createPostOrUnauthorized(
          root,
          args,
          context
        );

        NotificationService.createReplyNotification(
          root,
          { post: postOrReply },
          context
        );
        NotificationService.createMentionsNotification(
          root,
          { post: postOrReply },
          context
        );

        return {
          code: "201",
          success: true,
          message: "Successfully created post",
          post: postOrReply,
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
