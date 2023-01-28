import mongoose from "mongoose";
import { MessageSchema } from "../schema/main.js";

class MessageClass extends mongoose.Model {}

MessageSchema.loadClass(MessageClass);

export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
