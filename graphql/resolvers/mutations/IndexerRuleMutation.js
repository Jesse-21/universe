const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: _RoleMutationService,
} = require("../../../services/mutationServices/RoleMutationService");
const {
  Service: _IndexerRuleMutationService,
} = require("../../../services/mutationServices/IndexerRuleMutationService");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    createIndexerRuleForRole: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const RoleMutationService = new _RoleMutationService();
        const indexerRule =
          await RoleMutationService.createIndexerRuleForRoleOrUnauthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully created indexer rule",
          indexerRule,
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
    editIndexerRule: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const IndexerRuleMutationService = new _IndexerRuleMutationService();
        const indexerRule =
          await IndexerRuleMutationService.editIndexerRuleOrUnauthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully edited indexer rule",
          indexerRule,
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
