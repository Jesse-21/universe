const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/quest");

class QuestClass {
  static ping() {
    console.log("model: QuestClass");
  }

  /**
   * Find Quest[] and sort
   * @returns Quest[]
   */
  static async findAndSort({
    limit = 20,
    offset = 0,
    sort = "updatedAt",
  } = {}) {
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    return this.aggregate([
      //   { $match: matchQuery }, @TODO: add filters
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
  }
}

schema.loadClass(QuestClass);

const Quest = mongoose.models.Quest || mongoose.model("Quest", schema);

module.exports = {
  Quest,
};
