const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: _RegistrarService,
} = require("../../../services/RegistrarService");
const {
  Service: _CommunityMutationService,
} = require("../../../services/mutationServices/CommunityMutationService");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const CommunityMutationService = new _CommunityMutationService();

const resolvers = {
  Mutation: {
    editCommunity: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const community =
          await CommunityMutationService.editCommunityOrUnauthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully edited community",
          community,
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
    editCommunityAddressScore: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const community =
          await CommunityMutationService.editCommunityAddressScoreIfAuthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully edited community address score",
          community,
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
    registerCommunity: async (root, args, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const community = await RegistrarService.registerCommunity(
          root,
          args,
          context
        );

        return {
          code: "201",
          success: true,
          message: "Successfully registered community",
          community,
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
