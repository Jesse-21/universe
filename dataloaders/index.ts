import DataLoader from "dataloader";

import { Address } from "../models/address.js";
import { IAddress } from "../schema/interfaces.js";

const addressByIds = async (ids: readonly string[]) => {
  const addresses = await Address.find({ _id: { $in: ids } });

  const addressMap: { [key: string]: IAddress } = {};
  addresses.forEach((address: IAddress) => {
    addressMap[address._id] = address;
  });

  return ids.map((id) => addressMap[id]);
};

export const createDataLoaders = () => {
  return {
    addresses: new DataLoader(addressByIds),
  };
};
