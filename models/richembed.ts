import mongoose from "mongoose";
import { RichEmbedSchema } from "../schema/main.js";

import { IRichEmbed } from "../schema/interfaces.js";

class RichEmbedClass extends mongoose.Model {}

RichEmbedSchema.loadClass(RichEmbedClass);

export const RichEmbed =
  mongoose.models.RichEmbed ||
  mongoose.model<IRichEmbed>("RichEmbed", RichEmbedSchema);
