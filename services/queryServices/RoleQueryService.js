const { Service: RoleService } = require("../../services/RoleService");

const { AccountCommunityRole } = require("../../models/AccountCommunityRole");
const { AccountCommunity } = require("../../models/AccountCommunity");

class RoleQueryService extends RoleService {
  /**
   * Return the current account's role in the community
   * @returns Promise<RichContent>
   */
  async accountCommunityRole(role, args, context) {
    if (!role) return null;
    const accountCommunity = await AccountCommunity.findOne({
      account: context.account?._id || context.accountId,
      community: role.community,
    });
    if (!accountCommunity) return null;

    const accountCommunitiesRole = await AccountCommunityRole.findOne({
      role: role._id,
      accountCommunity: accountCommunity._id,
    });
    return accountCommunitiesRole;
  }
}

module.exports = { Service: RoleQueryService };
