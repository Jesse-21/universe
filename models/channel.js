import mongoose from "mongoose";
import { ChannelSchema } from "../schema/main.js";

class ChannelClass {
  constructor() {
    console.log("ChannelClass constructor");
  }
}

ChannelSchema.loadClass(ChannelClass);

export const Channel =
  mongoose.models.Channel || mongoose.model("Channel", ChannelSchema);
