const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/richBlocks/scriptableAction");

class ScriptableActionClass {
  static ping() {
    console.log("model: ScriptableActionClass");
  }
}

schema.loadClass(ScriptableActionClass);

const ScriptableAction =
  mongoose.models.ScriptableAction ||
  mongoose.model("ScriptableAction", schema);

module.exports = {
  ScriptableAction,
};
