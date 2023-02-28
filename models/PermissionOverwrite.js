const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../schemas/permissionOverwrite");

class PermissionOverwriteClass {
  static ping() {
    console.log("model: PermissionOverwriteClass");
  }
}

schema.loadClass(PermissionOverwriteClass);

const PermissionOverwrite =
  mongoose.models.PermissionOverwrite ||
  mongoose.model("PermissionOverwrite", schema);

module.exports = {
  PermissionOverwrite,
};
