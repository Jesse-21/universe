const get = require("lodash/get");
const { AccountAddress } = require("../../models/AccountAddress");
const { AccountNonce } = require("../../models/AccountNonce");
const { AccountSection } = require("../../models/AccountSection");
const { AccountRelationship } = require("../../models/AccountRelationship");
const { AccountThread } = require("../../models/AccountThread");
const { AccountCommunity } = require("../../models/AccountCommunity");
const { AccountExp } = require("../../models/AccountExp");
const { AccountInvite } = require("../../models/AccountInvite");
const { AccountInventory } = require("../../models/AccountInventory");

const {
  Service: _AccountQueryService,
} = require("../../services/queryServices/AccountQueryService");

const {
  isAuthorizedToAccessResource,
} = require("../../helpers/auth-middleware");

const AccountQueryService = new _AccountQueryService();
const resolvers = {
  AccountAddress: {
    passKeyId: async (parent, args, context) => {
      const hasAccess = isAuthorizedToAccessResource(
        parent,
        args,
        context,
        "accountAddress"
      );
      if (!hasAccess) return null;
      return parent?.passKeyId;
    },
    counter: async (parent, args, context) => {
      const hasAccess = isAuthorizedToAccessResource(
        parent,
        args,
        context,
        "accountAddress"
      );
      if (!hasAccess) return null;
      return parent?.counter;
    },
  },
  Account: {
    address: async (parent) => {
      const address = await AccountAddress.findById(
        get(parent, "addresses[0]")
      );
      return address;
    },
    relationship: async (parent, { to }) => {
      const relationship = await AccountRelationship.getTwoWayRelationship({
        from: parent._id,
        to,
      });
      return relationship;
    },
    nonces: async (parent) => {
      const accountNonce = await AccountNonce.findOne({ account: parent._id });
      return accountNonce;
    },
    profileImage: async (parent, _args, context) => {
      if (!parent.profileImage) return null;
      const image = await context.dataloaders.images.load(parent.profileImage);
      return image;
    },
    accountExp: async (parent) => {
      const accountExp = await AccountExp.findOne({ account: parent._id });
      return accountExp;
    },
    sections: async (parent) => {
      const sections = await AccountSection.find({ account: parent._id });
      return sections;
    },
    accountCommunities: async (parent, args) => {
      const accountCommunities = await AccountCommunity.findAndSort({
        ...args,
        filters: { account: parent._id, joined: true },
      });
      return accountCommunities;
    },
    accountThreads: async (parent, args, context) => {
      const hasAccess = isAuthorizedToAccessResource(
        parent,
        args,
        context,
        "account"
      );
      if (!hasAccess) return [];
      const accountThreads =
        await AccountThread.findAndSortByLatestThreadMessage(parent._id, args);

      return accountThreads;
    },
    inventory: async (parent, args) => {
      const inventoryItems = await AccountInventory.findAndSort({
        ...args,
        filters: { account: parent._id },
      });

      return inventoryItems;
    },
    email: async (parent, args, context) => {
      const hasAccess = isAuthorizedToAccessResource(
        parent,
        args,
        context,
        "account"
      );
      if (!hasAccess) return null;
      return parent?.email;
    },
    walletEmail: async (parent, args, context) => {
      const hasAccess = isAuthorizedToAccessResource(
        parent,
        args,
        context,
        "account"
      );
      if (!hasAccess) return null;
      return parent?.walletEmail;
    },
    encyrptedWalletJson: async (parent, args, context) => {
      const hasAccess = isAuthorizedToAccessResource(
        parent,
        args,
        context,
        "account"
      );
      if (!hasAccess) return null;
      return parent?.encyrptedWalletJson;
    },
    backpackAddress: async (parent) => {
      return await AccountQueryService.backpackAddress(parent);
    },
    backpackClaimed: async (parent) => {
      return await AccountQueryService.backpackClaimed(parent);
    },
    identities: async (parent, args) => {
      return AccountQueryService.identities(parent, args);
    },
    invite: async (parent) => {
      const invite = await AccountInvite.findOrCreate({
        accountId: parent._id,
      });
      return invite;
    },
    /**,
     * 🚨 Temporary hack resolver to check if account is a domain holder
     */
    hasPremiumRole: async (parent) => {
      return await AccountQueryService.hasPremiumRole(parent);
    },
  },
};

module.exports = { resolvers };
