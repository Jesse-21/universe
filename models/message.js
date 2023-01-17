import mongoose from "mongoose";
import { MessageSchema } from "../schema/main.js";

class MessageClass {}

MessageSchema.loadClass(MessageClass);

export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
