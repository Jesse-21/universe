const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  Service: _PaymasterService,
} = require("../../../services/PaymasterService");

// const {
//   unauthorizedErrorOrAccount,
// } = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    requestGasAndPaymasterAndData: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      /** On testnet so not needing auth for now */
      try {
        const PaymasterService = new _PaymasterService({
          apiKey: process.env.PAYMASTER_API_KEY,
        });
        const data = await PaymasterService.handlePaymaster(args);
        return {
          code: "201",
          success: true,
          message: "Successfully requested paymaster",
          ...data,
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
