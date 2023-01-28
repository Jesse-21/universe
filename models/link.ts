import mongoose from "mongoose";
import { LinkSchema } from "../schema/main.js";

class LinkClass extends mongoose.Model {}

LinkSchema.loadClass(LinkClass);

export const Link = mongoose.models.Link || mongoose.model("Link", LinkSchema);
