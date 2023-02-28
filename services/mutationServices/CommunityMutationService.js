const { Community } = require("../../models/Community");

const { Service: CommunityService } = require("../CommunityService");

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
