const mongoose = require("mongoose");
// https://mongoosejs.com/docs/advanced_schemas.html

const { schema } = require("../../schemas/quests/communityQuest");

class CommunityQuestClass {
  static ping() {
    console.log("model: CommunityQuestClass");
  }

  static async findOrCreate({ communityId, questId, isArchived, accountIds }) {
    /** step1: mandatory sanitize check */
    if (!communityId || !questId) {
      throw new Error("Missing required parameters");
    }
    /** step2: check for existing */
    const existing = await this.findOne({
      community: communityId,
      quest: questId,
    });
    if (existing) {
      if (accountIds) {
        existing.accounts = [
          ...new Set([...(existing.accounts || []), ...accountIds]),
        ];
      }
      if (isArchived !== undefined) {
        existing.isArchived = isArchived;
      }
      return await existing.save();
    }

    /** step2: create the CommunityQuest */
    const communityQuest = await this.create({
      community: communityId,
      quest: questId,
      isArchived,
      accounts: accountIds,
    });

    return communityQuest;
  }
}

schema.loadClass(CommunityQuestClass);

const CommunityQuest =
  mongoose.models.CommunityQuest || mongoose.model("CommunityQuest", schema);

module.exports = {
  CommunityQuest,
};
