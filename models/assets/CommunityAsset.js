const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/assets/communityAsset");

class CommunityAssetClass {
  static ping() {
    console.log("model: CommunityAssetClass");
  }

  /**
   * Find CommunityAsset[] and sort
   * @returns CommunityAsset[]
   */
  static async findAndSort({
    limit = 20,
    offset = 0,
    filters = {},
    sort = "_id",
  } = {}) {
    let matchQuery = {};
    if (filters.communityId) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.communityId),
      };
    }
    if (filters.type) {
      matchQuery = {
        ...matchQuery,
        type: mongoose.Types.ObjectId(filters.type),
      };
    }

    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    return this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);
  }
}

schema.loadClass(CommunityAssetClass);

const CommunityAsset =
  mongoose.models.CommunityAsset || mongoose.model("CommunityAsset", schema);

module.exports = {
  CommunityAsset,
};
