const merge = require("lodash/merge");

const { resolvers: Query } = require("./resolvers/Query");
const { resolvers: Account } = require("./resolvers/Account");
const { resolvers: RichContent } = require("./resolvers/RichContent");
const { resolvers: RichEmbed } = require("./resolvers/RichEmbed");
const { resolvers: Post } = require("./resolvers/Post");
const { resolvers: AccountSection } = require("./resolvers/AccountSection");
const { resolvers: AccountThread } = require("./resolvers/AccountThread");
const { resolvers: Thread } = require("./resolvers/Thread");
const { resolvers: Notification } = require("./resolvers/Notification");
const { resolvers: AccountReaction } = require("./resolvers/AccountReaction");
const {
  resolvers: AccountRelationship,
} = require("./resolvers/AccountRelationship");
const { resolvers: ChannelResolvers } = require("./resolvers/Channel");
const {
  resolvers: ChannelRecipientResolvers,
} = require("./resolvers/ChannelRecipient");
const { resolvers: Community } = require("./resolvers/Community");
const { resolvers: AccountCommunity } = require("./resolvers/AccountCommunity");

const { resolvers: Role } = require("./resolvers/Role");
const {
  resolvers: AccountCommunityRole,
} = require("./resolvers/AccountCommunityRole");
const { resolvers: IndexerRule } = require("./resolvers/IndexerRule");
const {
  resolvers: CommunityAsset,
} = require("./resolvers/assets/CommunityAsset");
const { resolvers: Quest } = require("./resolvers/Quest");

const { resolvers: MutationResolvers } = require("./resolvers/mutations");

const { resolvers: QuestsResolvers } = require("./resolvers/queries");

const {
  resolvers: CommunityResolvers,
} = require("./resolvers/community/index.js");
const {
  resolvers: AccountInventory,
} = require("./resolvers/AccountInventory.js");

/** main resolvers */
const resolvers = merge(
  Account,
  AccountSection,
  AccountThread,
  AccountRelationship,
  AccountCommunityRole,
  Thread,
  Query,
  RichContent,
  AccountReaction,
  Notification,
  Community,
  Post,
  AccountCommunity,
  Role,
  IndexerRule,
  CommunityAsset,
  Quest,
  ChannelResolvers,
  ChannelRecipientResolvers,
  AccountInventory,
  /** Community Resolvers */
  CommunityResolvers,
  /** mutation resolvers */
  MutationResolvers,
  /** query resolvers */
  QuestsResolvers,
  /** Rich Blocks */
  RichEmbed
);

module.exports = { resolvers };
