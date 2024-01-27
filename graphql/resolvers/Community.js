const { getGraphQLRateLimiter } = require("graphql-rate-limit");

const { AccountCommunity } = require("../../models/AccountCommunity");
const { Account } = require("../../models/Account");
const { Channel } = require("../../models/Channel");
const { Role } = require("../../models/Role");
const {
  Service: _RegistrarService,
} = require("../../services/RegistrarService");
const {
  Service: _CommunityQueryService,
} = require("../../services/queryServices/CommunityQueryService");
// const { CommunityService } = require("../../services");

// const { unauthorizedErrorOrAccount } = require("../../helpers/auth-middleware");

const CommunityQueryService = new _CommunityQueryService();

const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });
const RATE_LIMIT_MAX = 10_000;

const resolvers = {
  Community: {
    available: async (root, args = {}, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      const bebdomain = root.bebdomain || args.bebdomain;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "60s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return await RegistrarService.available(bebdomain);
    },
    expiresAt: async (root, args = {}, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      const bebdomain = root.bebdomain || args.bebdomain;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "60s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return await RegistrarService.expiresAt(bebdomain);
    },
    rentPrice: async (root, args = {}, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      const bebdomain = root.bebdomain || args.bebdomain;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "60s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return await RegistrarService.rentPrice({
        bebdomain,
        duration: args.duration,
      });
    },
    commitment: async (root, args = {}, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      const bebdomain = root.bebdomain || args.bebdomain;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "60s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      const hash = await RegistrarService.makeCommitment({
        bebdomain,
        address: args.address,
        duration: args.duration,
      });
      const secret = RegistrarService.makeSecret({
        bebdomain,
        address: args.address,
        duration: args.duration,
      });
      return {
        hash,
        secret,
      };
    },
    tokenId: async (root, args = {}, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      const bebdomain = root.bebdomain || args.bebdomain;
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "10s" }
      );
      if (errorMessage) throw new Error(errorMessage);
      return RegistrarService.getTokenIdFromLabel(bebdomain);
    },
    image: async (parent, _args, context) => {
      if (!parent.image) return null;
      const image = await context.dataloaders.images.load(parent.image);
      return image;
    },
    bannerImage: async (parent, _args, context) => {
      if (!parent.bannerImage) return null;
      const image = await context.dataloaders.images.load(parent.bannerImage);
      return image;
    },
    membersCount: async (parent) => {
      if (!parent?._id) return 0;
      const count = await AccountCommunity.countDocuments({
        joined: true,
        community: parent._id,
      });
      return count;
    },
    accountCommunity: async (parent, args, context) => {
      return await CommunityQueryService.accountCommunity(
        parent,
        args,
        context
      );
    },
    tokenOwnerAddress: async (root, args, context, info) => {
      const RegistrarService =
        context.services?.RegistrarService || new _RegistrarService();
      const errorMessage = await rateLimiter(
        { root, args, context, info },
        { max: RATE_LIMIT_MAX, window: "60s" }
      );

      const bebdomain = root.bebdomain || args.bebdomain;
      const tld = root.tld || args.tld || "beb";
      if (errorMessage) throw new Error(errorMessage);
      return await RegistrarService.getOwner(bebdomain, tld);
    },
    owner: async (parent) => {
      if (!parent?.owner) return null;
      const owner = await Account.findById(parent.owner);
      return owner;
    },
    members: async (parent, args) => {
      if (!parent?._id) return [];
      const accountCommunities = await AccountCommunity.findAndSort({
        ...args,
        filters: {
          joined: true,
          community: parent._id,
        },
      });
      return accountCommunities;
    },
    permissions: async (parent) => {
      if (!parent?._id) return [];
      await parent?.populate?.("permissions");
      return parent?.permissions || [];
    },
    roles: async (parent, args = {}) => {
      if (!parent?._id) return [];
      const roles = await Role.findAndSort({
        communityId: parent._id,
        ...args,
      });
      return roles;
    },
    channels: async (parent, args = {}) => {
      if (!parent?._id) return [];
      const channels = await Channel.findAndSort({
        filters: { communityId: parent._id, onlyPublic: true },
        ...args,
      });
      return channels;
    },
    currentAccountPermissions: async (parent, args, context) => {
      return await CommunityQueryService.currentAccountPermissions(
        parent,
        args,
        context
      );
    },
  },
};

module.exports = { resolvers };
