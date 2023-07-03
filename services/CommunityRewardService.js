const { Community } = require("../models/Community");
const { Service: _ScoreService } = require("./ScoreService");

class CommunityRewardService {
  /**
   * Check if a communityReward can be claimed
   * @returns Promise<Boolean>
   * */
  async canClaimCommunityReward(communityReward, _, context) {
    if (!communityReward) return false;
    if (communityReward.isArchived) return false;
    await context.account?.populate?.("addresses");
    const address = context.account?.addresses?.[0]?.address;
    if (!address) {
      return false;
    }
    const community = await Community.findById(
      communityReward.community
    ).select("bebdomain");

    const ScoreService = new _ScoreService();

    const score = await ScoreService.getCommunityScore({
      address: address,
      bebdomain: community.bebdomain,
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
