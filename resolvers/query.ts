const dimensions = [
  {
    name: "The Awakening",
  },
  {
    name: "City of Glass",
  },
];

export const resolvers = {
  Query: {
    dimensions: () => dimensions,
  },
};
