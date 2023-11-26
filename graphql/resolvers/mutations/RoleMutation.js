const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: _RoleMutationService,
} = require("../../../services/mutationServices/RoleMutationService");
const {
  Service: _CommunityMutationService,
} = require("../../../services/mutationServices/CommunityMutationService");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    createRoleForCommunity: async (
      root,
      { communityId, roleInput, ruleDataInputs },
      context,
      info
    ) => {
      const CommunityMutationService = new _CommunityMutationService();
      try {
        const errorMessage = await rateLimiter(
          {
            root,
            args: { communityId, roleInput, ruleDataInputs },
            context,
            info,
          },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(
          root,
          { communityId, roleInput, ruleDataInputs },
          context
        );
        if (!auth.account) return auth;

        const role =
          await CommunityMutationService.createRoleForCommunityOrUnauthorized(
            root,
            { communityId, roleInput },
            context
          );
        if (ruleDataInputs && ruleDataInputs.length > 0) {
          const RoleMutationService = new _RoleMutationService();
          await RoleMutationService.createIndexerRuleForRoleOrUnauthorized(
            root,
            { roleId: role._id, ruleDataInput: ruleDataInputs[0] },
            context
          );
        }
        return {
          code: "201",
          success: true,
          message: "Successfully created role",
          role,
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
    editRole: async (root, { roleId, roleInput }, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          {
            root,
            args: { roleId, roleInput },
            context,
            info,
          },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(
          root,
          { roleId, roleInput },
          context
        );
        if (!auth.account) return auth;

        const RoleMutationService = new _RoleMutationService();
        const role = await RoleMutationService.editRoleOrUnauthorized(
          root,
          { roleId, roleInput },
          context
        );

        return {
          code: "201",
          success: true,
          message: "Successfully edited role",
          role,
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
    deleteRole: async (root, { roleId }, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          {
            root,
            args: { roleId },
            context,
            info,
          },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(
          root,
          { roleId },
          context
        );
        if (!auth.account) return auth;

        const RoleMutationService = new _RoleMutationService();
        const deletedRoleId =
          await RoleMutationService.deleteRoleOrUnauthorized(
            root,
            { roleId },
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully deleted role",
          roleId: deletedRoleId,
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
    updateRolePermissions: async (root, args, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          { root, args, context, info },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const RoleMutationService = new _RoleMutationService();
        const role =
          await RoleMutationService.updateRolePermissionsOrUnauthorized(
            root,
            args,
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully edited role",
          role,
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
