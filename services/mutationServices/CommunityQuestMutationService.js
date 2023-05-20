const { Quest } = require("../../models/quests/Quest");
const { CommunityQuest } = require("../../models/quests/CommunityQuest");
const {
  CommunityQuestAccount,
} = require("../../models/quests/CommunityQuestAccount");
const { Community } = require("../../models/Community");

// const { Service: _QuestService } = require("../QuestService");
const { Service: _CommunityService } = require("../CommunityService");
const { Service: CommunityQuestService } = require("../CommunityQuestService");
const {
  Service: _CommunityAssetsService,
} = require("../assets/CommunityAssetsService");
const { Service: _ScoreService } = require("../ScoreService");

const CommunityAssetsService = new _CommunityAssetsService();
const ScoreService = new _ScoreService();

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
  async _claimRewardByType(reward, { communityId }, context) {
    if (reward.type === "ASSET_3D") {
      await CommunityAssetsService.addQuantityOrCreateAsset(null, {
        assetId: reward.rewardId,
        type: reward.type,
        communityId,
        maxQuantity: reward.quantity,
      });
    } else if (reward.type === "SCORE") {
      await context.account?.populate?.("addresses");
      const address = context.account?.addresses?.[0]?.address;
      if (!address) {
        throw new Error("You must be logged in to claim this reward.");
      }
      const community = await Community.findById(communityId);
      await ScoreService.setScore({
        address: address,
        scoreType: community.bebdomain,
        modifier: reward.quantity,
      });
    }

    return reward;
  }

  /**
   * Create the reward of a Quest for a community
   * @returns Promise<CommunityAsset[]>
   * */
  async _claimReward(communityQuest, { communityId }, context) {
    const quest = await Quest.findById(communityQuest.quest);
    if (!quest?.rewards?.length)
      throw new Error("No rewards found for this quest");

    const rewards = await Promise.all(
      quest.rewards.map(async (reward) => {
        const r = await this._claimRewardByType(
          reward,
          { communityId },
          context
        );
        return r;
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

    const communityAssets = await this._claimReward(
      communityQuest,
      { communityId, questId },
      context
    );

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
    if (!existing) {
      throw new Error(
        `CommunityQuest not found for questId ${questId}, communityId ${communityId}`
      );
    }

    // check if the account can complete the quest
    const status = await this.getQuestStatus(
      existing,
      { communityId, questId },
      context
    );
    if (status !== "CAN_COMPLETE" && status !== "CHECKED_IN") {
      // If it is CHECKED_IN, it means the account has already completed the quest, for idempontency do nothing
      throw new Error(
        `Your account cannot complete the quest status=${status}`
      );
    }

    await CommunityQuestAccount.findOrCreate({
      accountId: context.account._id,
      communityQuestId: existing._id,
    });

    return existing;
  }
}

module.exports = { Service: CommunityQuestMutationService };
