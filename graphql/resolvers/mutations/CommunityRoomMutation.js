const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  Service: _CommunityRoomService,
} = require("../../../services/CommunityRoomService");
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    getPeers: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const CommunityRoomService = new _CommunityRoomService();

        const peers = await CommunityRoomService.getPeers(
          root,
          {
            communityId: args.communityId,
          },
          context
        );

        return {
          peers,
          code: "201",
          success: true,
          message:
            "Successfully retrieved peers from communityRoom and removed expired",
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

    setPeer: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const CommunityRoomService = new _CommunityRoomService();

        const peers = await CommunityRoomService.setPeer(
          root,
          {
            communityId: args.communityId,
            peerId: args.peerId,
            account: auth.account,
          },
          context
        );

        return {
          peers,
          code: "201",
          success: true,
          message: "Successfully setPeer on communityRoom",
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
