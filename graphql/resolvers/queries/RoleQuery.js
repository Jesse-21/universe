const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { Role } = require("../../../models/Role");

const { AccountService } = require("../../../services");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  RoleQuery: {
    _id: () => "RoleQuery",
    /** Get Role by id */
    getRoleById: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      return await Role.findById(args.id);
    },
    /** Get if Role is claimable by current account */
    canClaimRole: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);

      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return false;

      return await AccountService.canClaimRole(auth.account, args);
    },
  },
};

module.exports = { resolvers };
