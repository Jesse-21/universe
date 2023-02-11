import mongoose from "mongoose";
import { AddressSchema } from "../schema/main.js";
import { getNameFromChainId } from "../helpers/chains.js";
import { validateAndConvertAddress } from "../helpers/validate.js";
import { IAddress } from "../schema/interfaces.js";

interface IAddressModel extends mongoose.Model<IAddress> {
  // find or create takes an object with address and chainId
  findOrCreate: (prop: {
    address: string;
    chainId: number;
  }) => Promise<IAddress>;
}

class AddressClass extends mongoose.Model {
  static async findOrCreate({
    address: rawAddress,
    chainId,
  }: {
    address: string;
    chainId: number;
  }): Promise<AddressClass> {
    if (!getNameFromChainId(chainId)) {
      throw new Error("Invalid chain ID!");
    }
    const address = validateAndConvertAddress(rawAddress);

    const existing = await this.aggregate([
      {
        $match: {
          $and: [{ "chain.chainId": chainId }, { address }],
        },
      },
    ]);
    if (existing.length > 0) {
      return existing[0];
    }

    return await this.create({
      address,
      chain: {
        chainId,
        name: getNameFromChainId(chainId),
      },
    });
  }
}

AddressSchema.loadClass(AddressClass);

export const Address =
  mongoose.models.Address ||
  mongoose.model<IAddress, IAddressModel>("Address", AddressSchema);
