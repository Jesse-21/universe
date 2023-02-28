const { Role } = require("../../models/Role");
const { AccountCommunity } = require("../../models/AccountCommunity");

const resolvers = {
  AccountCommunityRole: {
    accountCommunity: async (parent) => {
      return AccountCommunity.findById(parent.accountCommunity);
    },
    role: async (parent) => {
      return Role.findById(parent.role);
    },
  },
};

module.exports = { resolvers };
