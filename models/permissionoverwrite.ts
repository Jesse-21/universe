import mongoose from "mongoose";
import { PermissionOverwriteSchema } from "../schema/main.js";
import { IPermissionOverwrite } from "../schema/interfaces.js";

class PermissionOverwriteClass extends mongoose.Model {}

PermissionOverwriteSchema.loadClass(PermissionOverwriteClass);

export const PermissionOverwrite =
  mongoose.models.PermissionOverwrite ||
  mongoose.model<IPermissionOverwrite>(
    "PermissionOverwrite",
    PermissionOverwriteSchema
  );
