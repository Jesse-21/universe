const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  Service: _CommunityAssetMutationService,
} = require("../../../services/mutationServices/CommunityAssetMutationService");
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    editCommunityAsset: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const CommunityAssetMutationService =
          new _CommunityAssetMutationService();

        const [communityAsset, communityAssetMetadata] =
          await CommunityAssetMutationService.editCommunityAssetOrError(
            root,
            {
              communityAssetId: args.communityAssetId,
              metadataId: args.metadataId,
              position: args.position,
              positions: args.positions,
              deleteAsset: args.deleteAsset,
            },
            context
          );
        return {
          communityAsset,
          communityAssetMetadata,
          code: "201",
          success: true,
          message: "Successfully saved community asset",
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
