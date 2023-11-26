const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const {
  Service: _ChannelMutationService,
} = require("../../../services/mutationServices/ChannelMutationService");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    addChannelForCommunity: async (
      root,
      { communityId, channelInput, recipients },
      context,
      info
    ) => {
      try {
        const errorMessage = await rateLimiter(
          {
            root,
            args: { communityId, channelInput, recipients },
            context,
            info,
          },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(
          root,
          { communityId, channelInput, recipients },
          context
        );
        if (!auth.account) return auth;

        const ChannelMutationService = new _ChannelMutationService();
        const channel =
          await ChannelMutationService.createChannelForCommunityOrUnauthorized(
            root,
            { communityId, channelInput, recipients },
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully created channel",
          channel,
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
    editChannel: async (root, { channelId, channelInput }, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          {
            root,
            args: { channelId, channelInput },
            context,
            info,
          },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(
          root,
          { channelId, channelInput },
          context
        );
        if (!auth.account) return auth;

        const ChannelMutationService = new _ChannelMutationService();
        const channel =
          await ChannelMutationService.editChannelForCommunityOrUnauthorized(
            root,
            { channelId, channelInput },
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully edited channel",
          channel,
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
    deleteChannel: async (root, { channelId }, context, info) => {
      try {
        const errorMessage = await rateLimiter(
          {
            root,
            args: { channelId },
            context,
            info,
          },
          { max: RATE_LIMIT_MAX, window: "10s" }
        );
        if (errorMessage) throw new Error(errorMessage);

        const auth = await unauthorizedErrorOrAccount(
          root,
          { channelId },
          context
        );
        if (!auth.account) return auth;

        const ChannelMutationService = new _ChannelMutationService();
        const deletedChannelId =
          await ChannelMutationService.deleteChannelForCommunityOrUnauthorized(
            root,
            { channelId },
            context
          );

        return {
          code: "201",
          success: true,
          message: "Successfully deleted channel",
          channelId: deletedChannelId,
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
