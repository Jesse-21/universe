const { AccountCommunity } = require("../../models/AccountCommunity");

const { Service: CommunityService } = require("../CommunityService");
const {
  Service: _CurrentAccountPermissionService,
} = require("./CurrentAccountPermissionService");
const {
  Service: _InitializeAccountCommunityService,
} = require("../initializer/InitializeAccountCommunityService");

const { unauthorizedErrorOrAccount } = require("../../helpers/auth-middleware");

class CommunityQueryService extends CommunityService {
  /**
   * Create an account community for a community with the default public role if it does not exist
   * @returns Promise<AccountCommunity>
   */
  async accountCommunity(community, args, context) {
    const auth = await unauthorizedErrorOrAccount(community, args, context);
    if (!auth.account) return null;

    const accountCommunity = await AccountCommunity.findOne({
      account: auth.account._id,
      community: community._id,
    });

    // @TODO move the logic elsewhere to avoid mutation during query?
    if (!accountCommunity) {
      const InitializeAccountCommunityService =
        new _InitializeAccountCommunityService();

      return await InitializeAccountCommunityService.initialize(
        null,
        { communityId: community._id },
        context
      );
    }

    return accountCommunity;
  }

  /**
   * Get current account permissions for community
   * @returns Promise<CommunityCurrentAccountPermission>
   * */

  async currentAccountPermissions(parent, args, context) {
    const auth = await unauthorizedErrorOrAccount(parent, args, context);

    const communityId = parent?._id;
    const channelId = args?.channelId;
    const CurrentAccountPermissionService =
      new _CurrentAccountPermissionService();

    return {
      canAdmin: async () => {
        if (!auth.account || !communityId) return false;
        return await this.canAdmin(parent, args, context);
      },
      ...CurrentAccountPermissionService.currentAccountPermissions(
        parent,
        { communityId, channelId },
        context
      ),
    };
  }

  /**
   * Return channels for community
   * @returns Promise<Channel[]>
   */
  async channels(community) {
    if (!community) return [];
    const communityWithChannels = await community.populate?.({
      path: "channels",
      match: {
        isHidden: false,
      },
      sort: {
        createdAt: 1,
      },
    });
    return communityWithChannels?.channels || [];
  }
}

module.exports = { Service: CommunityQueryService };
