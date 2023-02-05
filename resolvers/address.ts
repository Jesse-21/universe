import { AddressNonce } from "../models/addressnonce.js";

export const resolvers = {
  Address: {
    nonce: async (parent: { _id: string }) => {
      const addressNonce = await AddressNonce.findOne({ account: parent._id });
      return addressNonce;
    },
  },
};
