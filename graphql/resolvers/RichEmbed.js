const resolvers = {
  RichEmbed: {
    image: async (parent, args, context) => {
      if (!parent.image) return null;
      const image = await context.dataloaders.images.load(parent.image);
      return image;
    },
    thumbnail: async (parent, args, context) => {
      if (!parent.thumbnail) return null;
      const image = await context.dataloaders.images.load(parent.thumbnail);
      return image;
    },
  },
};

module.exports = { resolvers };
