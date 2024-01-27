const Sentry = require("@sentry/node");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const {
  Service: _CommunityQuestMutationService,
} = require("../../../services/mutationServices/CommunityQuestMutationService");
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");
const {
  Service: _AlchemyService,
} = require("../../../services/AlchemyService");
const { Account } = require("../../../models/Account");
const { prod } = require("../../../helpers/registrar");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Mutation: {
    claimReward: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return auth;

      try {
        const CommunityQuestMutationService =
          new _CommunityQuestMutationService();

        const { communityQuest } =
          await CommunityQuestMutationService.claimRewardOrError(
            root,
            {
              communityId: args.communityId,
              questId: args.questId,
              questData: args.questData,
            },
            context
          );
        return {
          communityQuest,
          code: "201",
          success: true,
          message: "Successfully claimed quest reward",
        };
      } catch (e) {
        if (
          !(e.message || "").includes("Reward cannot be claimed at this time")
        ) {
          Sentry.captureException(e);
          console.error(e);
        }
        return {
          code: "500",
          success: false,
          message: e.message,
        };
      }
    },

    claimRewardByAddress: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const AlchemyService = new _AlchemyService({
          apiKey: prod().NODE_URL, // force use prod for BEB collection
          chain: prod().NODE_NETWORK, // force use prod for BEB collection
        });
        const OptimismAlchemyService = new _AlchemyService({
          apiKey: prod().OPTIMISM_NODE_URL, // force use prod for OP BEB collection
          chain: prod().OPTIMISM_NODE_NETWORK, // force use prod for OP BEB collection
        });
        let isOwner = await AlchemyService.isHolderOfCollection({
          wallet: args.address,
          contractAddress: prod().REGISTRAR_ADDRESS,
        });
        isOwner ||= await OptimismAlchemyService.isHolderOfCollection({
          wallet: args.address,
          contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS,
        });
        if (!isOwner) {
          return {
            code: "500",
            success: false,
            message:
              "You can only claim the reward if you hold a BEB pass in your address.",
          };
        }
        const account = await Account.findOrCreateByAddressAndChainId({
          address: args.address,
          chainId: 1,
        });

        const CommunityQuestMutationService =
          new _CommunityQuestMutationService();

        const { communityQuest } =
          await CommunityQuestMutationService.claimRewardOrError(
            root,
            {
              communityId: args.communityId,
              questId: args.questId,
              questData: args.questData,
            },
            { ...context, account }
          );
        return {
          communityQuest,
          code: "201",
          success: true,
          message: "Successfully claimed quest reward",
        };
      } catch (e) {
        if (
          !(e.message || "").includes("Reward cannot be claimed at this time")
        ) {
          Sentry.captureException(e);
          console.error(e);
        }
        return {
          code: "500",
          success: false,
          message: e.message,
        };
      }
    },

    claimCommunityRewardByAddress: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      try {
        const AlchemyService = new _AlchemyService({
          apiKey: prod().NODE_URL, // force use prod for BEB collection
          chain: prod().NODE_NETWORK, // force use prod for BEB collection
        });
        const OptimismAlchemyService = new _AlchemyService({
          apiKey: prod().OPTIMISM_NODE_URL, // force use prod for OP BEB collection
          chain: prod().OPTIMISM_NODE_NETWORK, // force use prod for OP BEB collection
        });
        let isOwner = await AlchemyService.isHolderOfCollection({
          wallet: args.address,
          contractAddress: prod().REGISTRAR_ADDRESS,
        });
        isOwner ||= await OptimismAlchemyService.isHolderOfCollection({
          wallet: args.address,
          contractAddress: prod().OPTIMISM_REGISTRAR_ADDRESS,
        });
        if (!isOwner) {
          return {
            code: "500",
            success: false,
            message:
              "You can only claim the reward if you hold a BEB pass in your address.",
          };
        }
        const account = await Account.findOrCreateByAddressAndChainId({
          address: args.address,
          chainId: 1,
        });

        const CommunityQuestMutationService =
          new _CommunityQuestMutationService();

        const { communityQuest } =
          await CommunityQuestMutationService.claimCommunityRewardOrError(
            root,
            {
              communityRewardId: args.communityRewardId,
            },
            { ...context, account }
          );
        return {
          communityQuest,
          code: "201",
          success: true,
          message: "Successfully claimed quest reward",
        };
      } catch (e) {
        if (
          !(e.message || "").includes("Reward cannot be claimed at this time")
        ) {
          Sentry.captureException(e);
          console.error(e);
        }
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
