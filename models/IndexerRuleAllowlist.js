const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/indexerRules/indexerRuleAllowlist");

const {
  validateAndConvertAddress,
} = require("../helpers/validate-and-convert-address");
const { mapChainIdToName } = require("../helpers/chain");

class IndexerRuleAllowlistClass {
  static ping() {
    console.log("model: IndexerRuleAllowlistClass");
  }

  /**
   * Create a new indexerRuleAllowlist
   * @param {ObjectId} indexerRuleId - the parent indexerRule
   * @param {String[]} addresses - the addresses to allow
   * @param {Number | String} chainId - the chainId where the addresses are located
   * @param {Number} maxAllowlistSize - the maximum number of addresses to allow
   * @returns {Promise<IndexerRuleAllowlist>}
   */
  static async create(
    { indexerRuleId, addresses, chainId },
    maxAllowlistSize = 100000
  ) {
    /** step1: mandatory sanitize check */
    if (!chainId || !addresses || !addresses.length) {
      throw new Error("Missing required parameters");
    }
    if (addresses.length > maxAllowlistSize) {
      throw new Error(
        `Too many addresses in the allowlist: ${addresses.length} > ${maxAllowlistSize}`
      );
    }

    /** step2: convert allowlist to array of sanitized address */
    const __addresses = await Promise.allSettled(
      addresses.map((address) => {
        return validateAndConvertAddress(address);
      })
    );
    const _addresses = __addresses
      .filter(({ status }) => status === "fulfilled")
      .map(({ value }) => value);

    /** step3: create the IndexerRuleAllowlist */
    const rule = new IndexerRuleAllowlist({
      addresses: _addresses,
      chain: {
        chainId,
        name: mapChainIdToName(chainId),
      },
      indexerRuleId,
    });
    await rule.save();
    return rule;
  }
}

schema.loadClass(IndexerRuleAllowlistClass);

const IndexerRuleAllowlist =
  mongoose.models.IndexerRuleAllowlist ||
  mongoose.model("IndexerRuleAllowlist", schema);

module.exports = {
  IndexerRuleAllowlist,
};
