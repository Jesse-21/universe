import { ethers } from "ethers";

/**
 * Validate address and convert it to a checksummed address
 * https://docs.ethers.io/v5/api/utils/address/
 * @returns String | Error
 */
export const validateAndConvertAddress = (address: string) => {
  if (!address) throw new Error("Invalid address");
  try {
    return ethers.utils.getAddress(address);
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new Error(e.message);
    } else {
      throw new Error("Error unknown, invalid address");
    }
  }
};
