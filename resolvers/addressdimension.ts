export const resolvers = {
  AddressDimension: {
    address: async (
      parent: {
        address: string;
      },
      _args: unknown,
      context: {
        dataloaders: {
          addresses: {
            load: (address: string) => Promise<string>;
          };
        };
      }
    ) => {
      return await context.dataloaders.addresses.load(parent.address);
    },
  },
};
