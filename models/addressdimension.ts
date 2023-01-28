import mongoose from "mongoose";
import { AddressDimensionSchema } from "../schema/main.js";

class AddressDimensionClass extends mongoose.Model {}

AddressDimensionSchema.loadClass(AddressDimensionClass);

export const AddressDimension =
  mongoose.models.AddressDimension ||
  mongoose.model("AddressDimension", AddressDimensionSchema);
