const { Quest } = require("../../models/quests/Quest");
const { CommunityQuest } = require("../../models/quests/CommunityQuest");
const { CommunityReward } = require("../../models/quests/CommunityReward");
const {
  CommunityRewardAccount,
} = require("../../models/quests/CommunityRewardAccount");
const {
  CommunityQuestAccount,
} = require("../../models/quests/CommunityQuestAccount");
const { Community } = require("../../models/Community");

// const { Service: _QuestService } = require("../QuestService");
const { Service: _CommunityService } = require("../CommunityService");
const { Service: CommunityQuestService } = require("../CommunityQuestService");
const {
  Service: _CommunityRewardService,
} = require("../CommunityRewardService");
const {
  Service: _CommunityAssetsService,
} = require("../assets/CommunityAssetsService");
const { Service: _ScoreService } = require("../ScoreService");
const { Service: _CacheService } = require("../../services/cache/CacheService");

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
    const CacheService = new _CacheService();
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
    } else if (reward.type === "IMAGE") {
      await context.account?.populate?.("addresses");
      const address = context.account?.addresses?.[0]?.address;
      if (!address) {
        throw new Error("You must be logged in to claim this reward.");
      }
      // for now store in cache
      const key = "ClaimRewardNFT";
      return await CacheService.setWithDupe({
        key: key,
        params: {
          address: address,
        },
        value: reward._id,
        // custom scores never expire, so has no expiredAt
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
  async claimRewardOrError(_, { communityId, questId, questData }, context) {
    const communityQuest = await CommunityQuest.findOne({
      community: communityId,
      quest: questId,
    });
    if (!communityQuest) {
      throw new Error("No Quest found");
    }
    const canClaimReward = await this.canClaimReward(
      communityQuest,
      { communityId, questId, questData },
      context
    );
    if (!canClaimReward)
      throw new Error("Reward cannot be claimed at this time.");

    const rewards = await this._claimReward(
      communityQuest,
      { communityId, questId },
      context
    );
    await CommunityQuestAccount.createOrUpdate({
      accountId: context.account._id,
      communityQuestId: communityQuest._id,
      rewardClaimed: true,
      isNotified: true, // mark as notified
    });

    return {
      communityQuest,
      rewards,
    };
  }

  /**
   * Claim a CommunityReward for a community or Error
   * @returns Promise<{ reward: QuestReward, communityReward: CommunityReward }>
   * */
  async claimCommunityRewardOrError(_, { communityRewardId }, context) {
    const communityReward = await CommunityReward.findById(communityRewardId);
    if (!communityReward) {
      throw new Error("No Community Reward found");
    }
    const CommunityRewardService = new _CommunityRewardService();
    const community = await Community.findById(
      communityReward.community
    ).select("bebdomain");
    await context.account?.populate?.("addresses");
    const address = context.account?.addresses?.[0]?.address;

    const canClaimReward = await CommunityRewardService.canClaimCommunityReward(
      communityReward,
      { bebdomain: community?.bebdomain, address },
      context
    );
    if (!canClaimReward)
      throw new Error("Reward cannot be claimed at this time.");

    const reward = await this._claimRewardByType(
      communityReward.reward,
      { communityId: communityReward.community },
      context
    );
    if (communityReward.type === "EXCHANGE") {
      // deduce the score from the user
      await ScoreService.setScore({
        address: address,
        scoreType: community.bebdomain,
        modifier: -communityReward.score,
      });
    }
    const communityRewardAccount = await CommunityRewardAccount.findOrCreate({
      accountId: context.account._id,
      communityRewardId: communityReward._id,
    });
    communityRewardAccount.rewardClaimedCount =
      communityRewardAccount.rewardClaimedCount + 1;
    await communityRewardAccount.save();

    return {
      reward,
      communityReward,
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
    if (
      status !== "CAN_COMPLETE" &&
      status !== "CHECKED_IN" &&
      status !== "CAN_CLAIM_REWARD"
    ) {
      throw new Error(
        `Your account cannot complete the quest status=${status}`
      );
    }

    if (status == "CHECKED_IN" || status == "CAN_CLAIM_REWARD") {
      // If it is CHECKED_IN or CAN_CLAIM_REWARD, it means the account is past IN_PROGRESS, for idempontency proceed
      return existing;
    }

    await CommunityQuestAccount.findOrCreate({
      accountId: context.account._id,
      communityQuestId: existing._id,
    });

    return existing;
  }
}

module.exports = { Service: CommunityQuestMutationService };
