import { Address } from "../models/address.js";

export class AddressService {
  static async createAddress(address: string) {
    const newAddress = await Address.create(address);
    return newAddress;
  }
}
