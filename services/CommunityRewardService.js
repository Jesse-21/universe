const { Community } = require("../models/Community");
const {
  CommunityRewardAccount,
} = require("../models/quests/CommunityRewardAccount");
const { Service: _ScoreService } = require("./ScoreService");

class CommunityRewardService {
  /**
   * Check if a communityReward can be claimed
   * @returns Promise<Boolean>
   * */
  async canClaimCommunityReward(
    communityReward,
    { bebdomain, address },
    context
  ) {
    if (!communityReward) return false;
    if (communityReward.isArchived) return false;

    if (!address || !bebdomain) {
      return false;
    }
    // if it is not infinite, check if the user has already claimed the reward
    if (communityReward.claimableQuantity !== -1) {
      const communityRewardAccount = await CommunityRewardAccount.findOne({
        communityReward: communityReward._id,
        account: context.accountId || context.account._id,
      });
      const claimedQuantity = communityRewardAccount?.rewardClaimedCount || 0;
      if (claimedQuantity >= communityReward.claimableQuantity) {
        return false;
      }
    }

    const ScoreService = new _ScoreService();

    const score = await ScoreService.getCommunityScore({
      address: address,
      bebdomain: bebdomain,
    });

    // if less than the required score, return false
    // @TODO check if the user has already claimed the reward
    if (score < communityReward.score) {
      return false;
    }
    return true;
  }
}

module.exports = { Service: CommunityRewardService };
