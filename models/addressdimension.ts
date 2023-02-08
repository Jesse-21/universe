import mongoose from "mongoose";
import { AddressDimensionSchema } from "../schema/main.js";
import { IAddressDimension } from "../schema/interfaces.js";

class AddressDimensionClass extends mongoose.Model {
  static async _existingAddressDimension({
    addressId,
    dimensionId,
  }: {
    addressId: string;
    dimensionId: string;
  }) {
    if (!addressId || !dimensionId) return null;
    return this.findOne({ address: addressId, dimension: dimensionId });
  }

  static async updateOrCreate({
    addressId,
    dimensionId,
    ...props
  }: {
    addressId: string;
    dimensionId: string;
  }): Promise<AddressDimensionClass> {
    const found = await this._existingAddressDimension({
      addressId,
      dimensionId,
    });
    if (found) {
      return found;
    }
    return await this.create({
      address: addressId,
      dimension: dimensionId,
      ...props,
    });
  }
}

AddressDimensionSchema.loadClass(AddressDimensionClass);

export const AddressDimension =
  mongoose.models.AddressDimension ||
  mongoose.model<IAddressDimension>("AddressDimension", AddressDimensionSchema);
