import mongoose from "mongoose";
import { AddressNonceSchema } from "../schema/main.js";

class AddressNonceClass extends mongoose.Model {}

AddressNonceSchema.loadClass(AddressNonceClass);

export const AddressNonce =
  mongoose.models.AddressNonce ||
  mongoose.model("AddressNonce", AddressNonceSchema);
