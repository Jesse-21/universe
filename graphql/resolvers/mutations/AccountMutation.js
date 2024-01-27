const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { Account } = require("../../../models/Account");

const { Post } = require("../../../models/Post");

const {
  AuthService,
  AccountService,
  AccountRecovererService,
} = require("../../../services");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    createAccountFromAddress: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const account = await Account.createFromAddress(args);
        return {
          code: "201",
          success: true,
          message: "Successfully created account",
          account,
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
    authByEncryptedWalletJson: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const { account, accessToken } =
          await AuthService.authByEncryptedWalletJson(args);

        return {
          code: "201",
          success: true,
          message: "Successfully created account",
          account,
          accessToken,
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
    addEncryptedWalletJson: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const auth = await unauthorizedErrorOrAccount(root, args, context);
        if (!auth.account) return auth;

        const updated = await auth.account.addEncryptedWalletJson(
          args.encyrptedWalletJson
        );

        return {
          code: "200",
          success: true,
          message: "Succesfully updated account",
          account: updated,
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
    updateCurrentAddress: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const accountAddress = await AccountService.updateCurrentAddress(
          auth.account,
          args
        );
        return {
          code: "200",
          success: true,
          message: "Succesfully updated account",
          accountAddress,
          account: auth.account,
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
    claimAllRoles: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const roles = await AccountService.claimRoles(auth.account, {
          communityId: args.communityId,
        });
        return {
          code: "200",
          success: true,
          message: "Succesfully claimed roles",
          account: auth.account,
          roles,
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
    deleteAccount: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      auth.account.deleted = true;
      await auth.account.save();

      await Post.updateMany({ account: auth.account._id }, { isHidden: true });

      return {
        code: "200",
        success: true,
        message: "Succesfully deleted account",
      };
    },
    updateCurrentAccount: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const account = await auth.account.updateMe(args);
        return {
          code: "200",
          success: true,
          message: "Succesfully updated account",
          account,
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
    addRecoverer: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const updatedAccount = await AccountRecovererService.addRecoverer(
          auth.account,
          args
        );
        return {
          code: "200",
          success: true,
          message: "Succesfully added recoverer",
          account: updatedAccount,
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
    authBySignature: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const { account, accessToken } = await AuthService.authenticate(args);

        return {
          code: "201",
          success: true,
          message: "Successfully authenticated",
          account,
          accessToken,
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
