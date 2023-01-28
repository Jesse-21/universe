import mongoose from "mongoose";
import { PermissionSchema } from "../schema/main.js";

class PermissionClass extends mongoose.Model {}

PermissionSchema.loadClass(PermissionClass);

export const Permission =
  mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
