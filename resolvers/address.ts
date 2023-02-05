import { AddressNonce } from "../models/addressnonce.js";
import { AddressDimension } from "../models/addressdimension.js";

export const resolvers = {
  Address: {
    nonce: async (parent: { _id: string }) => {
      const addressNonce = await AddressNonce.findOne({ account: parent._id });
      return addressNonce;
    },

    addressDimensions: async (parent: { _id: string }) => {
      const addressDimensions = await AddressDimension.find({
        address: parent._id,
      });
      return addressDimensions;
    },
  },
};
