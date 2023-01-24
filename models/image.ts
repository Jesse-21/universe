import mongoose from "mongoose";
import { ImageSchema } from "../schema/main.js";

class ImageClass {}

ImageSchema.loadClass(ImageClass);

export const Image =
  mongoose.models.Image || mongoose.model("Image", ImageSchema);
