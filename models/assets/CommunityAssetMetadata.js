const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/assets/communityAssetMetadata");

class CommunityAssetMetadataClass {
  static ping() {
    console.log("model: CommunityAssetMetadataClass");
  }

  /**
   * Find CommunityAssetMetadata[] and sort
   * @returns CommunityAssetMetadata[]
   */
  static async findAndSort({
    limit = 20,
    offset = 0,
    communityAssetId,
    sort = "_id",
  } = {}) {
    if (!communityAssetId) {
      throw new Error("communityAssetId is required");
    }

    let matchQuery = {
      communityAsset: mongoose.Types.ObjectId(communityAssetId),
    };

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

schema.loadClass(CommunityAssetMetadataClass);

const CommunityAssetMetadata =
  mongoose.models.CommunityAssetMetadata ||
  mongoose.model("CommunityAssetMetadata", schema);

module.exports = {
  CommunityAssetMetadata,
};
