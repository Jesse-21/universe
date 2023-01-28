import mongoose from "mongoose";
import { ImageSchema } from "../schema/main.js";

class ImageClass extends mongoose.Model {}

ImageSchema.loadClass(ImageClass);

export const Image =
  mongoose.models.Image || mongoose.model("Image", ImageSchema);
