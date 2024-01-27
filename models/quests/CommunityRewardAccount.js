const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/communityRewardAccount");

class CommunityRewardAccountClass {
  static ping() {
    console.log("model: CommunityRewardAccountClass");
  }

  static async findOrCreate({
    accountId,
    communityRewardId,
    isNotified = false,

    rewardClaimedCount = 0,
  }) {
    /** step1: mandatory sanitize check */
    if (!communityRewardId || !accountId) {
      throw new Error("Missing required parameters");
    }
    const existing = await this.findOne({
      communityReward: communityRewardId,
      account: accountId,
    });
    if (existing) {
      return existing;
    }

    /** step2: create the CommunityReward */
    const communityRewardAccount = await this.create({
      communityReward: communityRewardId,
      account: accountId,
      isNotified,
      rewardClaimedCount,
    });

    return communityRewardAccount;
  }
}

schema.loadClass(CommunityRewardAccountClass);

const CommunityRewardAccount =
  mongoose.models.CommunityRewardAccount ||
  mongoose.model("CommunityRewardAccount", schema);

module.exports = {
  CommunityRewardAccount,
};
