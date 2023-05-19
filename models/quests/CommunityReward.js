const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/communityReward");

class CommunityRewardClass {
  static ping() {
    console.log("model: CommunityRewardClass");
  }

  static _buildMatchQuery(filters = {}) {
    let matchQuery = {};
    if (filters.community) {
      matchQuery = {
        ...matchQuery,
        community: mongoose.Types.ObjectId(filters.community),
      };
    }
    return matchQuery;
  }

  /**
   * Find CommunityRewardClass[] and sort
   * @returns CommunityRewardClass[]
   */
  static async findAndSort({
    limit = 20,
    offset = 0,
    sort = "score",
    filters = {},
  } = {}) {
    const $sort =
      sort[0] === "-" ? { [sort.slice(1)]: -1, _id: 1 } : { [sort]: 1 };
    const matchQuery = this._buildMatchQuery(filters);

    const communityRewards = await this.aggregate([
      { $match: matchQuery },
      { $sort: $sort },
      { $skip: parseInt(offset, 10) },
      { $limit: parseInt(limit, 10) },
    ]);

    return communityRewards;
  }

  static async findOrCreate({ communityId, isArchived, reward, score }) {
    /** step1: mandatory sanitize check */
    if (!communityId || !reward) {
      throw new Error("Missing required parameters");
    }

    /** step2: create the CommunityReward */
    const communityReward = await this.create({
      community: communityId,
      isArchived,
      reward,
      score,
    });

    return communityReward;
  }
}

schema.loadClass(CommunityRewardClass);

const CommunityReward =
  mongoose.models.CommunityReward || mongoose.model("CommunityReward", schema);

module.exports = {
  CommunityReward,
};
