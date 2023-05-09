const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/communityReward");

class CommunityRewardClass {
  static ping() {
    console.log("model: CommunityRewardClass");
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
