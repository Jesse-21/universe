const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/richBlocks/richEmbed");

class RichEmbedClass {
  static ping() {
    console.log("model: RichEmbedClass");
  }
}

schema.loadClass(RichEmbedClass);

const RichEmbed =
  mongoose.models.RichEmbed || mongoose.model("RichEmbed", schema);

module.exports = {
  RichEmbed,
};
