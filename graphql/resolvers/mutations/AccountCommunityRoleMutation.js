const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: _RoleMutationService,
} = require("../../../services/mutationServices/RoleMutationService");
const { AccountService } = require("../../../services");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const RoleMutationService = new _RoleMutationService();

const resolvers = {
  Mutation: {
    grantRole: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const accountCommunityRole =
          await RoleMutationService.grantRoleOrUnauthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully granted role",
          accountCommunityRole,
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
    revokeRole: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const accountCommunityRole =
          await RoleMutationService.revokeRoleOrUnauthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully revoked role",
          accountCommunityRole,
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
    claimRole: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const accountCommunityRole = await AccountService.claimRole(
          auth.account,
          args,
          context
        );

        return {
          code: "201",
          success: true,
          message: "Successfully claimed role",
          accountCommunityRole,
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
