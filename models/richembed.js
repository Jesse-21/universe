import mongoose from "mongoose";
import { RichEmbedSchema } from "../schema/main.js";

class RichEmbedClass {}

RichEmbedSchema.loadClass(RichEmbedClass);

export const RichEmbed =
  mongoose.models.RichEmbed || mongoose.model("RichEmbed", RichEmbedSchema);
