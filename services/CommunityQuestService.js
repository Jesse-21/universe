const { Quest } = require("../models/quests/Quest");
const {
  CommunityQuestAccount,
} = require("../models/quests/CommunityQuestAccount");

const { Service: _QuestService } = require("./QuestService");
class CommunityQuestService {
  /**
   * Check if a communityQuest can claim the reward
   * @TODO THIS IS A HACK AND SHOULD BE REFACTORED OR DEPRECATED
   * @returns Promise<Boolean>
   * */
  async canClaimReward(communityQuest, _, context) {
    if (!communityQuest) return false;
    if (communityQuest.isArchived) return false;

    const quest = await Quest.findById(communityQuest.quest);
    const requirement = quest?.requirements?.[0];
    if (requirement?.type.includes("FARCASTER")) {
      const communityQuestAccount = await CommunityQuestAccount.findOne({
        communityQuest: communityQuest._id,
        account: context.account?._id || context.accountId,
      });
      if (!communityQuestAccount) return false;
      return !communityQuestAccount.rewardClaimed;
    }
    switch (requirement?.type) {
      case "COMMUNITY_PARTICIPATION": {
        const requiredAmount =
          requirement.data?.find(
            (data) => data.key === "requiredParticipationCount"
          )?.value || 1;
        return communityQuest.accounts?.length >= requiredAmount;
      }
      default: {
        return false;
      }
    }
  }

  /**
   * type QuestStatus: "IN_PROGRESS" | "COMPLETED" | "CAN_COMPLETE" | "CAN_CLAIM_REWARD" | "CHECKED_IN"
   * CAN_COMPLETE: the account can complete the quest
   * CAN_CLAIM_REWARD: the account can claim the reward
   * Get the quest status of a community
   * @returns Promise<QuestStatus>
   * */
  async getQuestStatus(communityQuest, _, context) {
    if (!communityQuest || !context.account) return "IN_PROGRESS";
    if (communityQuest.isArchived) return "COMPLETED";
    const canClaimReward = await this.canClaimReward(
      communityQuest,
      _,
      context
    );
    if (canClaimReward) return "CAN_CLAIM_REWARD";

    // if account already completed the quest and cannot claim reward
    const exist = await CommunityQuestAccount.exists({
      communityQuest: communityQuest._id,
      account: context.account._id,
    });
    if (exist) {
      return "CHECKED_IN";
    }

    const quest = await Quest.findById(communityQuest.quest);
    const QuestService = new _QuestService();
    const canCompleteQuest = await QuestService.canCompleteQuest(
      quest,
      { communityId: communityQuest.community },
      context
    );
    if (canCompleteQuest) return "CAN_COMPLETE";
    return "IN_PROGRESS";
  }
}

module.exports = { Service: CommunityQuestService };
