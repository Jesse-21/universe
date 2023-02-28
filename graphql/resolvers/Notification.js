const resolvers = {
  Notification: {
    initiator: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.initiator);
      return account;
    },
    receiver: async (parent, _args, context) => {
      const account = await context.dataloaders.accounts.load(parent.receiver);
      return account;
    },
    image: async (parent, _args, context) => {
      if (!parent.image) return null;
      const image = await context.dataloaders.images.load(parent.image);
      return image;
    },
  },
};

module.exports = { resolvers };
