import mongoose from "mongoose";
import { ChannelRecipientSchema } from "../schema/main.js";

class ChannelRecipientClass extends mongoose.Model {}

ChannelRecipientSchema.loadClass(ChannelRecipientClass);

export const ChannelRecipient =
  mongoose.models.ChannelRecipient ||
  mongoose.model("ChannelRecipient", ChannelRecipientSchema);
