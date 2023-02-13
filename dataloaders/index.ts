import DataLoader from "dataloader";

import { Address } from "../models/address.js";
import { Dimension } from "../models/dimension.js";
import { IDimension, IAddress } from "../schema/interfaces.js";

const addressByIds = async (ids: readonly string[]) => {
  const addresses = await Address.find({ _id: { $in: ids } });

  const addressMap: { [key: string]: IAddress } = {};
  addresses.forEach((address: IAddress) => {
    addressMap[address._id] = address;
  });

  return ids.map((id) => addressMap[id]);
};

const dimensionByIds = async (ids: readonly string[]) => {
  const dimensions = await Dimension.find({ _id: { $in: ids } });

  const dimensionMap: { [key: string]: IDimension } = {};
  dimensions.forEach((dimension: IDimension) => {
    dimensionMap[dimension._id] = dimension;
  });

  return ids.map((id) => dimensionMap[id]);
};

export const createDataLoaders = () => {
  return {
    addresses: new DataLoader(addressByIds),
    dimensions: new DataLoader(dimensionByIds),
  };
};
