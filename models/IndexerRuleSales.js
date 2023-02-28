const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/indexerRules/indexerRuleSales");

class IndexerRuleSalesClass {
  static ping() {
    console.log("model: IndexerRuleSalesClass");
  }
}

schema.loadClass(IndexerRuleSalesClass);

const IndexerRuleSales =
  mongoose.models.IndexerRuleSales ||
  mongoose.model("IndexerRuleSales", schema);

module.exports = {
  IndexerRuleSales,
};
