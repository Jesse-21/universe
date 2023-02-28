const { Community } = require("../../models/Community");
const { AccountCommunityRole } = require("../../models/AccountCommunityRole");
const { IndexerRule } = require("../../models/IndexerRule");

const {
  Service: _RoleQueryService,
} = require("../../services/queryServices/RoleQueryService");

const { unauthorizedErrorOrAccount } = require("../../helpers/auth-middleware");

const RoleQueryService = new _RoleQueryService();
const resolvers = {
  Role: {
    community: async (parent) => {
      return Community.findById(parent.community);
    },
    indexerRules: async (parent) => {
      return IndexerRule.find({ _id: { $in: parent.indexerRules } });
    },
    membersCount: async (parent) => {
      const count = await AccountCommunityRole.countDocuments({
        isValid: true,
        role: parent._id,
      });
      return count;
    },
    members: async (parent, args) => {
      const accountCommunitiesRole = await AccountCommunityRole.findAndSort({
        ...args,
        filters: {
          isValid: true,
          role: parent._id,
        },
      });
      return accountCommunitiesRole;
    },
    accountCommunityRole: async (parent, args, context) => {
      const auth = await unauthorizedErrorOrAccount(parent, args, context);
      if (!auth.account) return null;

      return await RoleQueryService.accountCommunityRole(parent, args, context);
    },
  },
};

module.exports = { resolvers };
