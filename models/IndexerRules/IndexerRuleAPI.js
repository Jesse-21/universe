const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/indexerRules/indexerRuleAPI");

class IndexerRuleAPIClass {
  static ping() {
    console.log("model: IndexerRuleAPIClass");
  }
}

schema.loadClass(IndexerRuleAPIClass);

const IndexerRuleAPI =
  mongoose.models.IndexerRuleAPI || mongoose.model("IndexerRuleAPI", schema);

module.exports = {
  IndexerRuleAPI,
};
