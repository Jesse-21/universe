const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/communityQuestAccount");

class CommunityQuestAccountClass {
  static ping() {
    console.log("model: CommunityQuestAccountClass");
  }

  static async findOrCreate({ accountId, communityQuestId }) {
    /** step1: mandatory sanitize check */
    if (!accountId || !communityQuestId) {
      throw new Error("Missing required parameters");
    }
    /** step2: check for existing */
    const existing = await this.findOne({
      account: accountId,
      communityQuest: communityQuestId,
    });
    if (existing) return existing;

    /** step2: create the CommunityQuest */
    const communityQuestAccount = await this.create({
      account: accountId,
      communityQuest: communityQuestId,
    });

    return communityQuestAccount;
  }

  static async createOrUpdate({
    accountId,
    communityQuestId,
    rewardClaimed,
    isNotified,
  }) {
    /** step1: mandatory sanitize check */
    if (!accountId || !communityQuestId) {
      throw new Error("Missing required parameters");
    }
    /** step2: check for existing */
    const existing = await this.findOne({
      account: accountId,
      communityQuest: communityQuestId,
    });
    if (existing) {
      existing.rewardClaimed = rewardClaimed;
      existing.isNotified = isNotified;
      return await existing.save();
    }

    /** step2: create the CommunityQuest */
    const communityQuestAccount = await this.create({
      account: accountId,
      communityQuest: communityQuestId,
      rewardClaimed,
      isNotified,
    });

    return communityQuestAccount;
  }
}

schema.loadClass(CommunityQuestAccountClass);

const CommunityQuestAccount =
  mongoose.models.CommunityQuestAccount ||
  mongoose.model("CommunityQuestAccount", schema);

module.exports = {
  CommunityQuestAccount,
};
