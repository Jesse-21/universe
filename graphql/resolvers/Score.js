const { AccountAddress } = require("../../models/AccountAddress");

const resolvers = {
  Score: {
    account: async (parent) => {
      const populated = await AccountAddress.findOne({
        address: parent.address,
      }).populate("account");
      return populated.account;
    },
  },
};

module.exports = { resolvers };
