import { DimensionSchema } from "../schema/main.js";

class DimensionClass {
  constructor() {
    console.log("DimensionClass constructor");
  }
}

DimensionSchema.loadClass(DimensionClass);

export const Dimension =
  mongoose.models.Dimension || mongoose.model("Dimension", DimensionSchema);
