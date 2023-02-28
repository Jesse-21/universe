const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/indexerRules/indexerRuleNFT");

class IndexerRuleNFTClass {
  static ping() {
    console.log("model: IndexerRuleNFTClass");
  }

  static async create({ indexerRuleId, addressId, tokenId, minAmount }) {
    /** step1: mandatory sanitize check */
    if (!addressId || !indexerRuleId) {
      throw new Error("Missing required parameters");
    }

    /** step2: create the IndexerRuleNFT */
    const rule = new IndexerRuleNFT({
      address: mongoose.Types.ObjectId(addressId),
      tokenId,
      minAmount,
      indexerRuleId,
    });

    await rule.save();
    return rule;
  }
}

schema.loadClass(IndexerRuleNFTClass);

const IndexerRuleNFT =
  mongoose.models.IndexerRuleNFT || mongoose.model("IndexerRuleNFT", schema);

module.exports = {
  IndexerRuleNFT,
};
