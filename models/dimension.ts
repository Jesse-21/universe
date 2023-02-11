import mongoose from "mongoose";
import { DimensionSchema } from "../schema/main.js";
import { IDimension } from "../schema/interfaces.js";
class DimensionClass extends mongoose.Model {}

DimensionSchema.loadClass(DimensionClass);

export const Dimension = mongoose.model<IDimension>(
  "Dimension",
  DimensionSchema
);
