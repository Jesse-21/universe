const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/indexerRules/indexerRuleCollection");

class IndexerRuleCollectionClass {
  static ping() {
    console.log("model: IndexerRuleCollectionClass");
  }
}

schema.loadClass(IndexerRuleCollectionClass);

const IndexerRuleCollection =
  mongoose.models.IndexerRuleCollection ||
  mongoose.model("IndexerRuleCollection", schema);

module.exports = {
  IndexerRuleCollection,
};
