const resolvers = {
  SectionEntry: {
    image: async (parent, _args, context) => {
      if (!parent.image) return null;
      const image = await context.dataloaders.images.load(parent.image);
      return image;
    },
  },
};

module.exports = { resolvers };
