const { withFilter } = require("graphql-subscriptions");

const resolvers = {
  Subscription: {
    postCreated: {
      subscribe: async (root, args, context, info) => {
        return withFilter(
          () => context?.pubSub?.asyncIterator(["POST_CREATED"]),
          (payload, variables) => {
            if (!variables.channelId) return true;
            return (
              payload.postCreated.channel?.toString() === variables.channelId
            );
          }
        )(root, args, context, info);
      },
    },
  },
};

module.exports = { resolvers };
