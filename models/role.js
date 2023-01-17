import mongoose from "mongoose";
import { RoleSchema } from "../schema/main.js";

class RoleClass {
  constructor() {
    console.log("RoleClass constructor");
  }
}

RoleSchema.loadClass(RoleClass);

export const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
