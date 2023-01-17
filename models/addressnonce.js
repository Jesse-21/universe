import mongoose from "mongoose";
import { AddressNonceSchema } from "../schema/main.js";

class AddressNonceClass {
  constructor() {
    console.log("AddressNonceClass constructor");
  }
}

AddressNonceSchema.loadClass(AddressNonceClass);

export const AddressNonce =
  mongoose.models.AddressNonce ||
  mongoose.model("AddressNonce", AddressNonceSchema);
