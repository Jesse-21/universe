const { AccountCommunityService } = require("../../services");

const resolvers = {
  AccountCommunity: {
    account: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.account);
      return account;
    },
    community: async (parent, _args, context) => {
      const community = await context.dataloaders.communities.load(
        parent.community
      );
      return community;
    },
    unseenPostsCount: async (parent, args, context) => {
      if (!parent?.joined) return 0;

      const unseenPostsCount =
        await AccountCommunityService.countUnseenPostsCount(
          parent,
          {},
          context
        );
      return unseenPostsCount;
    },
  },
};

module.exports = { resolvers };
