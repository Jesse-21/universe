const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/richBlocks/collection");

class CollectionClass {
  static ping() {
    console.log("model: CollectionClass");
  }
}

schema.loadClass(CollectionClass);

const Collection =
  mongoose.models.Collection || mongoose.model("Collection", schema);

module.exports = {
  Collection,
};
