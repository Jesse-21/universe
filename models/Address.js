const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/address");

const ChainHelpers = require("../helpers/chain");
const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");

class AddressClass {
  static ping() {
    console.log("model: AddressClass");
  }

  /**
   * Create an address
   * @returns Promise<Address>
   */
  static async findOrCreate({ address: rawAddress, chainId }) {
    if (!ChainHelpers.chainTable[chainId]) {
      throw new Error("Invalid chain id");
    }
    const address = validateAndConvertAddress(rawAddress);

    const existing = await this.aggregate([
      {
        $match: {
          $and: [{ "chain.chainId": chainId }, { address }],
        },
      },
    ]);
    if (existing.length > 0) {
      return existing[0];
    }

    return this.create({
      address,
      chain: {
        chainId,
        name: ChainHelpers.mapChainIdToName(chainId),
      },
    });
  }
}

schema.loadClass(AddressClass);

const Address = mongoose.models.Address || mongoose.model("Address", schema);

module.exports = {
  Address,
};
