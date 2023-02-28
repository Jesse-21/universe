const { AccountRelationship } = require("../../models/AccountRelationship");

const resolvers = {
  AccountRelationship: {
    from: async (parent, _args, context) => {
      return await context.dataloaders.accounts.load(parent.account);
    },
    to: async (parent, _args, context) => {
      return await context.dataloaders.accounts.load(parent.account);
    },
    connection: async (parent) => {
      if (parent.connection) return parent.connection;
      return AccountRelationship.findOne({
        to: parent.from?._id || parent.from,
        from: parent.to?._id || parent.to,
      });
    },
  },
};

module.exports = { resolvers };
