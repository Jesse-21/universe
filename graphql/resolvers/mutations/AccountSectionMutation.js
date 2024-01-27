const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { AccountSection } = require("../../../models/AccountSection");
const {
  unauthorizedErrorOrAccount,
  unauthorizedResponse,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    addAccountSection: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const accountSection = await AccountSection.addDefaultToAccount({
          accountId: auth.account._id,
          ...args,
        });
        return {
          code: "201",
          success: true,
          message: "Successfully created account section",
          accountSection,
        };
      } catch (e) {
        return {
          code: "500",
          success: false,
          message: e.message,
        };
      }
    },
    updateAccountSection: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const _accountSection = await AccountSection.findById(
          args.accountSectionId
        );
        if (
          !_accountSection ||
          _accountSection.account.toString() !== auth.account._id.toString()
        )
          return unauthorizedResponse;
        const accountSection = await _accountSection.updateMe(args);

        return {
          code: "200",
          success: true,
          message: "Successfully updated account section",
          accountSection,
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
    deleteAccountSection: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const _accountSection = await AccountSection.findById(
          args.accountSectionId
        );
        if (
          !_accountSection ||
          _accountSection.account.toString() !== auth.account._id.toString()
        )
          return unauthorizedResponse;
        const deletedId = await _accountSection.deleteMe();

        return {
          code: "200",
          success: true,
          message: "Successfully deleted account section",
          accountSection: { _id: deletedId },
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
    updateAccountSectionEntry: async (
      root,
      { accountSectionId, entryId, ...args },
      context,
      info
    ) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const _accountSection = await AccountSection.findById(accountSectionId);
        if (
          !_accountSection ||
          _accountSection.account.toString() !== auth.account._id.toString()
        )
          return unauthorizedResponse;
        const accountSection = await _accountSection.updateEntry(entryId, args);

        return {
          code: "200",
          success: true,
          message: "Successfully updated account section entry",
          accountSection,
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
    addAccountSectionEntry: async (
      root,
      { accountSectionId, ...args },
      context,
      info
    ) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const _accountSection = await AccountSection.findById(accountSectionId);

        if (
          !_accountSection ||
          _accountSection.account.toString() !== auth.account._id.toString()
        )
          return unauthorizedResponse;
        const accountSection = await _accountSection.addDefauEntry();

        return {
          code: "200",
          success: true,
          message: "Successfully updated account section entry",
          accountSection,
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
    deleteAccountSectionEntry: async (
      root,
      { accountSectionId, entryId, ...args },
      context,
      info
    ) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const _accountSection = await AccountSection.findById(accountSectionId);
        if (
          !_accountSection ||
          _accountSection.account.toString() !== auth.account._id.toString()
        )
          return unauthorizedResponse;
        const accountSection = await _accountSection.deleteEntry(entryId);

        return {
          code: "200",
          success: true,
          message: "Successfully deleted account section entry",
          accountSection,
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
