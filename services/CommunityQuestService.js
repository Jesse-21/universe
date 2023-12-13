const { Quest } = require("../models/quests/Quest");
const {
  CommunityQuestAccount,
} = require("../models/quests/CommunityQuestAccount");
const { Casts, Reactions, ReactionType } = require("../models/farcaster");

const {
  Service: FarcasterServiceV2,
} = require("../services/identities/FarcasterServiceV2");

const { Service: QuestService } = require("./QuestService");
const { ListingLogs } = require("../models/farcaster");

const FARQUEST_FID = "12741";

class CommunityQuestService extends QuestService {
  async canSatisfyRequirement(
    communityQuest,
    { requirement, quest, questData },
    context
  ) {
    if (requirement?.type.includes("VALID_NFT")) {
      const canClaim = await this._canCompleteValidNFTQuest(
        quest,
        { requirement },
        context
      );
      return canClaim;
    }

    if (requirement?.type.includes("FARCASTER_")) {
      await context.account.populate?.("addresses");
      const address = context.account?.addresses?.[0]?.address;
      const FarcasterService = new FarcasterServiceV2();
      const farcasterProfiles = await FarcasterService.getProfilesByAddress(
        address
      );
      for (const farcasterProfile of farcasterProfiles) {
        if (requirement.type === "FARCASTER_ACCOUNT") {
          return true;
        } else if (requirement.type.includes("FARCASTER_CASTS_")) {
          // extract the number of casts required from the requirement type and parse it to int
          const requiredCasts = parseInt(
            requirement.type.replace("FARCASTER_CASTS_", "")
          );
          const totalCasts = await Casts.countDocuments({
            fid: farcasterProfile._id,
            deletedAt: null,
          });
          if (totalCasts >= requiredCasts) {
            return true;
          }
        } else if (requirement.type.includes("FARCASTER_FOLLOWERS_")) {
          const requiredFollowers = parseInt(
            requirement.type.replace("FARCASTER_FOLLOWERS_", "")
          );
          if (farcasterProfile.followers >= requiredFollowers) {
            return true;
          }
        } else if (requirement.type.includes("FARCASTER_LIKES_")) {
          const requiredLikes = parseInt(
            requirement.type.replace("FARCASTER_LIKES_", "")
          );
          const totalCastLikes = await Reactions.countDocuments({
            fid: { $ne: farcasterProfile._id },
            targetFid: farcasterProfile._id,
            reactionType: ReactionType.REACTION_TYPE_LIKE,
            deletedAt: null,
          });
          if (totalCastLikes >= requiredLikes) {
            return true;
          }
        } else if (requirement.type === "FARCASTER_FARQUEST_TAGGED") {
          const farquestMentionCasts = await Casts.find({
            fid: farcasterProfile._id,
            mentions: { $in: [parseInt(FARQUEST_FID)] },
            timestamp: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            deletedAt: null,
          });
          const farquestPurpleMentions = farquestMentionCasts.filter(
            (c) =>
              c.text.toLowerCase().includes("purple") &&
              !c.text.includes("purple-season-certificate2x.png")
          ).length;
          if (farquestPurpleMentions > 0) {
            return true;
          }
        }
      }

      return false;
    }

    switch (requirement?.type) {
      case "TOTAL_NFT": {
        const canClaim = await this._canCompleteTotalNFTQuest(
          quest,
          { requirement },
          context
        );
        return canClaim;
      }
      case "COMMUNITY_PARTICIPATION": {
        const requiredAmount =
          requirement.data?.find(
            (data) => data.key === "requiredParticipationCount"
          )?.value || 1;
        return communityQuest.accounts?.length >= requiredAmount;
      }
      case "MULTICHOICE_SINGLE_QUIZ": {
        const answer = questData.find((input) => input.key === "answer")?.value;
        if (!answer) return false;
        const correctAnswer = requirement.data?.find(
          (d) => d.key === "correctAnswer"
        )?.value;
        return answer.toLowerCase() === correctAnswer?.toLowerCase();
      }
      case "FARMARKET_LISTING_FIRST": {
        if (!context.account || context.isExternal) return false;
        await context.account.populate?.("addresses");

        const hasListing = await ListingLogs.exists({
          eventType: "Listed",
          from: context.account.addresses?.[0]?.address,
        });
        return !!hasListing;
      }
      case "FARMARKET_BUY_FIRST": {
        if (!context.account || context.isExternal) return false;
        await context.account.populate?.("addresses");

        const hasBuy = await ListingLogs.exists({
          eventType: "Bought",
          from: context.account.addresses?.[0]?.address,
        });
        return !!hasBuy;
      }

      case "FARMARKET_OFFER_FIRST": {
        if (!context.account || context.isExternal) return false;
        await context.account.populate?.("addresses");

        const hasOffer = await ListingLogs.exists({
          eventType: "OfferMade",
          from: context.account.addresses?.[0]?.address,
        });
        return !!hasOffer;
      }
      default: {
        return false;
      }
    }
  }

  /**
   * Check if a communityQuest can claim the reward
   * @returns Promise<Boolean>
   * */
  async canClaimReward(communityQuest, { questData = [] }, context) {
    if (!communityQuest) return false;
    if (communityQuest.isArchived) return false;

    const quest = await Quest.findById(communityQuest.quest);
    if (!quest || (quest.startsAt && quest.startsAt > new Date())) return false;

    const communityQuestAccount = await CommunityQuestAccount.findOne({
      communityQuest: communityQuest._id,
      account: context.account?._id || context.accountId,
    });
    if (communityQuestAccount?.rewardClaimed) return false; // already claimed
    if (!quest.requirements || quest.requirements.length === 0) return true;

    const canSatisfyRequirements = await Promise.all(
      quest.requirements.map((requirement) =>
        this.canSatisfyRequirement(
          communityQuest,
          { requirement, quest, questData },
          context
        )
      )
    );
    const joinOperator = quest.requirementJoinOperator || "OR";
    if (joinOperator === "OR") {
      return canSatisfyRequirements.some((r) => r);
    }
    if (joinOperator === "AND") {
      return canSatisfyRequirements.every((r) => r);
    }
    return false;
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
    const found = await CommunityQuestAccount.exists({
      communityQuest: communityQuest._id,
      account: context.account._id,
    });
    if (found && found.rewardClaimed) {
      return "CHECKED_IN";
    }

    return "IN_PROGRESS";
  }

  async checkIfCommunityQuestClaimedByAddress(communityQuest, _, context) {
    if (!communityQuest) return false;
    // if account already completed the quest and cannot claim reward
    const communityQuestAccount = await CommunityQuestAccount.findOne({
      communityQuest: communityQuest._id,
      account: context.account?._id || context.accountId,
    });
    if (communityQuestAccount?.rewardClaimed) return true;
    return false;
  }
}

module.exports = { Service: CommunityQuestService };
