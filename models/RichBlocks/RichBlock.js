const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/richContentBlock");

class RichBlockClass {
  static ping() {
    console.log("model: RichBlockClass");
  }
}

schema.loadClass(RichBlockClass);

const RichBlock =
  mongoose.models.RichBlock || mongoose.model("RichBlock", schema);

module.exports = {
  RichBlock,
};
