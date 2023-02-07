import DataLoader from "dataloader";
import { Address } from "../models/address.js";

export const createDataLoaders = () => {
  return {
    addresses: new DataLoader<number, typeof Address>(async (ids) => {
      const addresses = await Address.find({ _id: { $in: ids } });

      // Create a map of the addresses
      const addressMap: { [key: number]: typeof Address } = {};
      addresses.forEach((address: typeof Address) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore fix this when models are correctly defined in typescript
        addressMap[address._id] = address;
      });

      return ids.map((id) => addressMap[id]);
    }),
  };
};
