const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { Thread } = require("../../../models/Thread");
const { AccountThread } = require("../../../models/AccountThread");
const { ThreadTransaction } = require("../../../models/ThreadTransaction");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");
const {
  getAddressFromEnsOrAddress,
} = require("../../../helpers/get-address-from-ens");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    createThread: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const recipientAddress = await getAddressFromEnsOrAddress(
          args.recipientAddress
        );
        const [thread, accountThreads] = await Thread.createThread({
          fromAccountId: auth.account._id,
          ...args,
          recipientAddress,
        });
        return {
          code: "201",
          success: true,
          message: "Successfully created thread",
          thread,
          accountThreads,
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
    createStakedThread: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const [thread, threadTransaction] = await Thread.createStakedThread({
          senderId: auth.account._id,
          ...args,
        });

        return {
          code: "201",
          success: true,
          message: "Successfully created thread",
          thread,
          threadTransaction,
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
    updateAccountThreadLastSeen: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;
      try {
        const accountThread = await AccountThread.updateAccountThreadLastSeen({
          accountId: auth.account._id,
          ...args,
        });

        return {
          code: "200",
          success: true,
          message: "Successfully updated thread",
          accountThread,
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
    acceptAccountThread: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const accountThread = await AccountThread.acceptAccountThread({
          accountId: auth.account._id,
          ...args,
        });

        return {
          code: "200",
          success: true,
          message: "Successfully accepeted thread",
          accountThread,
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
    completeThreadTransaction: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const threadTransaction = await ThreadTransaction.completeTransaction({
          ...args,
        });

        return {
          code: "200",
          success: true,
          message: "Successfully completed thread transaction",
          threadTransaction,
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
