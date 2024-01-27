const { Community } = require("../../models/Community");

const { Service: CommunityService } = require("../CommunityService");
const { Service: _ScoreService } = require("../ScoreService");
// createRoleForCommunity
class CommunityMutationService extends CommunityService {
  /**
   * Edit a community if authorized
   * @returns Promise<Post>
   */
  async editCommunityOrUnauthorized(_, { communityId, ...props }, context) {
    const community = await Community.findById(communityId);
    const canAdmin = await this.canAdmin(community, { communityId }, context);

    if (!canAdmin) {
      throw new Error("You do not have permission to edit the community.");
    }
    return await community.edit(props);
  }

  /**
   * Assign a score to a community address if authorized
   * @returns Promise<Post>
   */
  async editCommunityAddressScoreIfAuthorized(
    _,
    { bebdomain, ...props },
    context
  ) {
    if (!props.address) {
      throw new Error("You must specify an address to assign a score.");
    }

    const community = await Community.findOne({ bebdomain });
    if (!community) {
      throw new Error(
        "You must specify a valid community to assign a score to."
      );
    }

    const canAdmin = await this.canAdmin(community, { bebdomain }, context);
    if (!canAdmin) {
      throw new Error("You do not have permission to edit the community.");
    }

    const ScoreService = new _ScoreService();
    return await ScoreService.setScore({
      scoreType: community.bebdomain,
      address: props.address,
      score: props.score,
      modifier: props.modifier,
    });
  }
  /**
   * Edit a community if authorized
   * @returns Promise<Post>
   */
  async createRoleForCommunityOrUnauthorized(
    _,
    { communityId, roleInput },
    context
  ) {
    const community = await Community.findById(communityId);
    const canAdmin = await this.canAdmin(community, { communityId }, context);

    if (!canAdmin) {
      throw new Error("You do not have permission to edit the community.");
    }
    return await this.createRoleForCommunity(
      community,
      { ...roleInput, editable: true },
      context
    );
  }
}

module.exports = { Service: CommunityMutationService };
