const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/quest");

class QuestClass {
  static ping() {
    console.log("model: QuestClass");
  }
  static _buildMatchQuery(filters = {}) {
    let matchQuery = {};
    if (filters.communities?.length) {
      matchQuery = {
        ...matchQuery,
        community: {
          $in: filters.communities.map((cid) => {
            return mongoose.Types.ObjectId(cid);
          }),
        },
      };
    }
    if (filters.community) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.community),
      };
    }
    return matchQuery;
  }

  /**
   * Find Quest[] and sort
   * @returns Quest[]
   */
  static async findAndSort({
    limit = 20,
    offset = 0,
    sort = "updatedAt",
    filters = {},
  } = {}) {
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    const matchQuery = this._buildMatchQuery(filters);

    const quests = await this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
    return quests;
  }
}

schema.loadClass(QuestClass);

const Quest = mongoose.models.Quest || mongoose.model("Quest", schema);

module.exports = {
  Quest,
};
