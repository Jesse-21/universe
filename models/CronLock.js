const mongoose = require("mongoose");

const { schema } = require("../schemas/cronLock");

class CronLockClass {
  static ping() {
    console.log("model: CronLockClass");
  }

  static async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async createLock(name) {
    // Prevent race conditions since MongoDB is not ACID
    await this.sleep(10000 * Math.random());
    const obj = await this.findOne({ name: name });
    if (obj) return null;
    return this.create({
      name: name,
    });
  }
}

schema.loadClass(CronLockClass);

const CronLock = mongoose.models.CronLock || mongoose.model("CronLock", schema);

module.exports = {
  CronLock,
};
