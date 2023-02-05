import { AddressDimension } from "../models/addressdimension";

export class AccessControlService {
  static async addressDimensionByDimensionIdControl(
    _: unknown,
    { dimensionId }: { dimensionId: string },
    context: { addressId?: string; account?: { _id: string } }
  ): Promise<boolean> {
    const existing = await AddressDimension.exists({
      dimension: dimensionId,
      address: context.addressId || context.account?._id,
    });
    if (!existing) return false;
    return true;
  }
}
