import mongoose from "mongoose";
import { DimensionSchema } from "../schema/main.js";

class DimensionClass {}

DimensionSchema.loadClass(DimensionClass);

export const Dimension =
  mongoose.models.Dimension || mongoose.model("Dimension", DimensionSchema);
