const { Quest } = require("../../models/quests/Quest");
const { CommunityQuest } = require("../../models/quests/CommunityQuest");
const { Community } = require("../../models/Community");

// const { Service: _QuestService } = require("../QuestService");
const { Service: _CommunityService } = require("../CommunityService");
const { Service: CommunityQuestService } = require("../CommunityQuestService");
const {
  Service: _CommunityAssetsService,
} = require("../assets/CommunityAssetsService");

class CommunityQuestMutationService extends CommunityQuestService {
  async _canAdminCommunityOrError(community, props, context) {
    const CommunityService = new _CommunityService();
    const canAdmin = await CommunityService.canAdmin(community, props, context);
    if (!canAdmin) {
      throw new Error("You do not have permission to perform this action.");
    }
    return true;
  }

  /**
   * Create the reward of a Quest for a community
   * @returns Promise<CommunityAsset[]>
   * */
  async _claimReward(communityQuest) {
    const quest = await Quest.findById(communityQuest.quest);
    if (!quest?.rewards?.length)
      throw new Error("No rewards found for this quest");

    const CommunityAssetsService = new _CommunityAssetsService();

    const rewards = await Promise.all(
      quest.rewards.map(async (reward) => {
        const communityAsset =
          await CommunityAssetsService.addQuantityOrCreateAsset(null, {
            assetId: reward.rewardId,
            type: reward.type,
            communityId: communityQuest.community,
            maxQuantity: reward.quantity,
          });
        return communityAsset;
      })
    );
    return rewards;
  }
  /**
   * Claim the reward of a Quest for a community or Error
   * @returns Promise<{ communityQuest: CommunityQuest, communityAssets: CommunityAsset[] }>
   * */
  async claimRewardOrError(_, { communityId, questId }, context) {
    const communityQuest = await CommunityQuest.findOne({
      community: communityId,
      quest: questId,
    });
    const canClaimReward = await this.canClaimReward(communityQuest);
    if (!canClaimReward)
      throw new Error("Reward cannot be claimed at this time.");

    const community = await Community.findById(communityId);
    await this._canAdminCommunityOrError(community, { communityId }, context);
    const communityAssets = await this._claimReward(communityQuest);

    communityQuest.isArchived = true;
    await communityQuest.save();
    return {
      communityQuest,
      communityAssets,
    };
  }

  /**
   * Complete a quest for a community, add the accountId to the accounts array
   * @returns Promise<CommunityQuest>
   * */
  async completeQuest(_, { communityId, questId }, context) {
    const existing = await CommunityQuest.findOne({
      community: communityId,
      quest: questId,
    });
    if (existing) {
      // check if the account can complete the quest
      const status = await this.getQuestStatus(
        existing,
        { communityId, questId },
        context
      );
      if (status !== "CAN_COMPLETE") {
        throw new Error("Your account cannot complete the quest");
      }
    }

    const communityQuest = await CommunityQuest.findOrCreate({
      communityId,
      questId,
      accountIds: [context.account._id],
    });

    return communityQuest;
  }
}

module.exports = { Service: CommunityQuestMutationService };
