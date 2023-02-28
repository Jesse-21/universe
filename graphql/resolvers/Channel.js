const { Community } = require("../../models/Community");
const { ChannelRecipient } = require("../../models/ChannelRecipient");
const { Image } = require("../../models/Image");
const { AccountChannel } = require("../../models/AccountChannel");

const {
  Service: _CurrentAccountPermissionService,
} = require("../../services/queryServices/CurrentAccountPermissionService");
const { unauthorizedErrorOrAccount } = require("../../helpers/auth-middleware");

const resolvers = {
  Channel: {
    community: async (parent) => {
      return Community.findById(parent.community);
    },
    icon: async (parent) => {
      return Image.findById(parent.icon);
    },
    recipients: async (parent) => {
      if (!parent?.recipients?.length) return [];
      if (parent.recipients?.[0]?.slug) {
        return parent.recipients;
      }
      const recipients = await ChannelRecipient.find({ channel: parent._id });
      return recipients;
    },
    currentAccountChannel: async (parent, args, context) => {
      if (!context.accountId) return null;
      return await AccountChannel.findOrCreate({
        accountId: context.accountId,
        channelId: parent._id,
      });
    },
    createdBy: async (parent, args, context) => {
      if (!parent.createdBy) return null;
      const account = await context.dataloaders.accounts.load(parent.createdBy);
      return account;
    },
    lastPost: async (parent, args, context) => {
      if (!parent.lastPost) return null;
      const post = await context.dataloaders.posts.load(parent.lastPost);
      return post;
    },
    currentAccountPermissions: async (parent, args, context) => {
      await unauthorizedErrorOrAccount(parent, args, context);

      const communityId = parent?.community;
      const channelId = parent?._id;
      const CurrentAccountPermissionService =
        new _CurrentAccountPermissionService();

      return CurrentAccountPermissionService.currentAccountPermissions(
        parent,
        { communityId, channelId },
        context
      );
    },
  },
};

module.exports = { resolvers };
