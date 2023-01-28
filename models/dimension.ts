import mongoose from "mongoose";
import { DimensionSchema } from "../schema/main.js";

class DimensionClass extends mongoose.Model {}

DimensionSchema.loadClass(DimensionClass);

export const Dimension =
  mongoose.models.Dimension || mongoose.model("Dimension", DimensionSchema);
