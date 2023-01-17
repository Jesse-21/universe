import mongoose from "mongoose";
import { AddressSchema } from "../schema/main.js";

class AddressClass {
  constructor() {
    console.log("AddressClass constructor");
  }
}

AddressSchema.loadClass(AddressClass);

export const Address =
  mongoose.models.Address || mongoose.model("Address", AddressSchema);
