const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { AccountRelationship } = require("../../../models/AccountRelationship");

const { NotificationService } = require("../../../services");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    toggleFollow: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const relationship = await AccountRelationship.toggleFollow({
          from: auth.account._id,
          ...args,
        });
        NotificationService.createConnectionRequestNotification(
          root,
          { relationship },
          context
        );

        return {
          code: "201",
          success: true,
          message: "Successfully updated AccountRelationship",
          relationship,
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
    toggleBlock: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const relationship = await AccountRelationship.toggleBlock({
          from: auth.account._id,
          ...args,
        });

        return {
          code: "201",
          success: true,
          message: "Successfully updated AccountRelationship",
          relationship,
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
