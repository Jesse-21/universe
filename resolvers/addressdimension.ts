import { IAddressDimension } from "../schema/interfaces.js";

export const resolvers = {
  AddressDimension: {
    address: async (
      parent: IAddressDimension,
      _args: unknown,
      context: {
        dataloaders: {
          addresses: {
            load: (address: string) => Promise<string>;
          };
        };
      }
    ) => {
      return await context.dataloaders.addresses.load(
        parent.address.toString()
      );
    },
  },
};
