import { AddressDimension } from "../models/addressdimension";

class AccessControlService {
  async addressDimensionByDimensionIdControl(
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

module.exports = { Service: AccessControlService };
