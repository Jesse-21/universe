import mongoose from "mongoose";
import { LinkSchema } from "../schema/main.js";

class LinkClass {}

LinkSchema.loadClass(LinkClass);

export const Link = mongoose.models.Link || mongoose.model("Link", LinkSchema);
