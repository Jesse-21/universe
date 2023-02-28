const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/identities/farcaster");

/**
 * THIS is DEPRECATED in Farcaster v2 and BROKEN as of 2021-09-08
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 * DO NOT USE IT
 */
class FarcasterClass {
  static ping() {
    console.log("model: FarcasterClass");
  }
}

schema.loadClass(FarcasterClass);

const Farcaster =
  mongoose.models.Farcaster || mongoose.model("Farcaster", schema);

module.exports = {
  Farcaster,
};
