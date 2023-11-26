const { Notification } = require("../../../models/Notification");
const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;
const {
  unauthorizedErrorOrAccount,
} = require("../../../helpers/auth-middleware");

const resolvers = {
  NotificationQuery: {
    _id: (_root, _args, context) => {
      return context.accountId;
    },
    getAccountNotifications: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return [];
      return Notification.find({
        receiver: auth.account._id,
        initiator: { $ne: auth.account._id },
      })
        .sort("-createdAt")
        .skip(args.offset || 0)
        .limit(args.limit || 20);
    },
    counUnseenNotifications: async (root, args, context, info) => {
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const auth = await unauthorizedErrorOrAccount(root, args, context);
      if (!auth.account) return 0;
      return Notification.countDocuments({
        receiver: auth.account._id,
        initiator: { $ne: auth.account._id },
        lastSeen: null,
      });
    },
  },
};

module.exports = { resolvers };
