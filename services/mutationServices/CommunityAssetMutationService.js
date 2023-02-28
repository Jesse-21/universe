const { CommunityAsset } = require("../../models/assets/CommunityAsset");
const { Community } = require("../../models/Community");

const { Service: _CommunityService } = require("../CommunityService");
const {
  Service: CommunityAssetsService,
} = require("../assets/CommunityAssetsService");

class CommunityQuestMutationService extends CommunityAssetsService {
  async _canAdminCommunityOrError(community, props, context) {
    const CommunityService = new _CommunityService();
    const canAdmin = await CommunityService.canAdmin(community, props, context);

    if (!canAdmin) {
      throw new Error(
        "Only admins of the community can edit. If you are an admin, please make sure you are signed in."
      );
    }
    return true;
  }

  /**
   * Edit a community asset or error
   * @returns Promise<CommunityAsset>
   * */
  async editCommunityAssetOrError(
    _,
    { communityAssetId, position, positions, deleteAsset, metadataId },
    context
  ) {
    const communityAsset = await CommunityAsset.findById(communityAssetId);
    if (!communityAsset)
      throw new Error("Community asset not found for this id");

    const community = await Community.findById(communityAsset.community);

    const ADMIN_CHECK = false; // enable or disable admin check
    if (ADMIN_CHECK) {
      await this._canAdminCommunityOrError(
        community,
        { communityAssetId },
        context
      );
    }

    const res = await this.editCommunityAsset(communityAsset, {
      position,
      positions,
      deleteAsset,
      metadataId,
    });
    return res;
  }
}

module.exports = { Service: CommunityQuestMutationService };
