import { AddressNonce } from "../models/addressnonce.js";
import { AddressDimension } from "../models/addressdimension.js";
import { IAddress } from "../schema/interfaces.js";

export const resolvers = {
  Address: {
    nonce: async (parent: IAddress) => {
      const addressNonce = await AddressNonce.findOne({ account: parent._id });
      return addressNonce;
    },

    addressDimensions: async (parent: IAddress) => {
      const addressDimensions = await AddressDimension.find({
        address: parent._id,
      });
      return addressDimensions;
    },
  },
};
