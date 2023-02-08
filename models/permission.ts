import mongoose from "mongoose";
import { PermissionSchema } from "../schema/main.js";
import { IPermission } from "../schema/interfaces.js";

class PermissionClass extends mongoose.Model {
  static async _verifyUniqueIdentifier({
    uniqueIdentifier,
    dimensionId,
  }: {
    uniqueIdentifier: string;
    dimensionId: string;
  }): Promise<boolean> {
    const existing = await this.exists({
      uniqueIdentifier,
      dimension: dimensionId,
    });
    if (existing) {
      throw new Error(`Unique identifier ${uniqueIdentifier} already token`);
    }
    return true;
  }

  _generateBitwiseFlagAndPosition(bitwisePosition: number): PermissionClass {
    if (bitwisePosition > 62 || bitwisePosition < 0) {
      throw new Error("Invalid bitwisePosition: must be between 0 and 62");
    }
    this.bitwisePosition = bitwisePosition || 0;
    this.bitwiseFlag = BigInt(1 << this.bitwisePosition).toString();
    return this;
  }

  static async findByUniqueIdentifierOrId({
    dimensionId,
    permissionId,
    uniqueIdentifier,
  }: {
    dimensionId?: string;
    permissionId?: string;
    uniqueIdentifier?: string;
  }) {
    let permission = null;

    if (permissionId) {
      permission = await this.findById(permissionId);
    }

    if (!permission) {
      if (!dimensionId) return null;
      permission = await this.findOne({
        uniqueIdentifier: uniqueIdentifier,
        dimension: dimensionId,
      });
    }

    return permission;
  }
}

PermissionSchema.loadClass(PermissionClass);

export const Permission =
  mongoose.models.Permission ||
  mongoose.model<IPermission>("Permission", PermissionSchema);
