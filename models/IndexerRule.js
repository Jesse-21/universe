const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html
const pick = require("lodash/pick");

const { schema } = require("../schemas/indexerRule");

class IndexerRuleClass {
  static ping() {
    console.log("model: IndexerRuleClass");
  }

  /**
   * edit a indexer rule
   * @param {IndexerRuleType} indexerRuleType the rule's type
   * @param {ObjectId} ruleDataId the rule data's id
   * @returns {Promise<Role>}
   */
  async edit(fields) {
    const _fields = pick(fields, ["indexerRuleType", "ruleDataId"]);

    if (_fields.indexerRuleType !== undefined) {
      this.indexerRuleType = _fields.indexerRuleType;
    }

    if (_fields.ruleDataId !== undefined) {
      this.ruleDataId = _fields.ruleDataId;
    }
    return this.save();
  }
}

schema.loadClass(IndexerRuleClass);

const IndexerRule =
  mongoose.models.IndexerRule || mongoose.model("IndexerRule", schema);

module.exports = {
  IndexerRule,
};
