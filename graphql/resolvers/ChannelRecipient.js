const { Channel } = require("../../models/Channel");

const resolvers = {
  ChannelRecipient: {
    channel: async (parent) => {
      return Channel.findById(parent.channel);
    },
    recipientType: async (parent) => {
      if (parent.recipientType === 0) {
        return "ACCOUNT";
      } else if (parent.recipientType === 1) {
        return "ROLE";
      }
      return null;
    },
    recipient: async (parent, args, context) => {
      let _key = null;
      let recipient = null;
      let recipientType = null;

      if (parent.recipientType === 0) {
        _key = "account";
        recipient = await context.dataloaders.accounts.load(parent.recipientId);
        recipientType = "ACCOUNT";
      } else if (parent.recipientType === 1) {
        _key = "role";
        recipient = await context.dataloaders.roles.load(parent.recipientId);
        recipientType = "ROLE";
      }
      return {
        _id: parent.recipientId,
        type: recipientType,
        [_key]: recipient,
      };
    },
  },
  Recipient: {
    __resolveType(parent) {
      switch (parent.type) {
        case "ACCOUNT":
          return "AccountRecipientUnion";
        case "ROLE":
          return "RoleRecipientUnion";
        default:
          return "AccountRecipientUnion";
      }
    },
  },
};

module.exports = { resolvers };
