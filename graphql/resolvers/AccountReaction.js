const { Post } = require("../../models/Post");

const resolvers = {
  ReactionObject: {
    __resolveType(_parent) {
      return "Post";
    },
  },
  AccountReaction: {
    reactionObject: async (parent) => {
      let reactionObject = null;
      if (parent.reactionObjectType === "POST") {
        reactionObject = await Post.findById(parent.reactionObjectTypeId);
      }
      return reactionObject;
    },
    account: async (parent, _args, context) => {
      return await context.dataloaders.accounts.load(parent.account);
    },
  },
};

module.exports = { resolvers };
