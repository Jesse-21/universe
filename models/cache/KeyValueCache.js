const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/cache/keyValueCache");

class KeyValueCacheClass {
  static ping() {
    console.log("model: KeyValueCacheClass");
  }

  /**
   * create a cache entry or update existing cache entry with new value and expiresAt
   * @returns Promise<AccountCommunity> || null
   */
  static async updateOrCreate({ key, value, expiresAt }) {
    const found = await this.findOne({
      key,
    });
    if (found) {
      found.value = value;
      found.expiresAt = expiresAt;
      return found.save();
    }
    return this.create({
      key,
      value,
      expiresAt,
    });
  }
}

schema.loadClass(KeyValueCacheClass);

const KeyValueCache =
  mongoose.models.KeyValueCache || mongoose.model("KeyValueCache", schema);

module.exports = {
  KeyValueCache,
};
