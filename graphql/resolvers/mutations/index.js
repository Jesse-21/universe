const merge = require("lodash/merge");
const {
  resolvers: AccountReactionMutation,
} = require("./AccountReactionMutation");
const {
  resolvers: AccountSectionMutation,
} = require("./AccountSectionMutation");
const { resolvers: AccountMutation } = require("./AccountMutation");
const { resolvers: NotificationMutation } = require("./NotificationMutation");
const { resolvers: PostMutation } = require("./PostMutation");
const { resolvers: ThreadMutation } = require("./ThreadMutation");
const { resolvers: ThreadMessageMutation } = require("./ThreadMessageMutation");
const {
  resolvers: AccountRelationshipMutation,
} = require("./AccountRelationshipMutation");
const { resolvers: RoleMutation } = require("./RoleMutation");
const {
  resolvers: AccountCommunityMutation,
} = require("./AccountCommunityMutation");
const { resolvers: CommunityMutation } = require("./CommunityMutation");
const {
  resolvers: AccountCommunityRoleMutation,
} = require("./AccountCommunityRoleMutation");
const { resolvers: IndexerRuleMutation } = require("./IndexerRuleMutation");
const {
  resolvers: CommunityQuestMutation,
} = require("./CommunityQuestMutation");
const { resolvers: CommunityRoomMutation } = require("./CommunityRoomMutation");
const {
  resolvers: CommunityAssetMutation,
} = require("./CommunityAssetMutation");
const { resolvers: ChannelMutation } = require("./ChannelMutation");
const {
  resolvers: AccountChannelMutation,
} = require("./AccountChannelMutation");
const { resolvers: PaymasterMutation } = require("./PaymasterMutation");

const resolvers = merge(
  AccountSectionMutation,
  AccountMutation,
  ThreadMutation,
  ThreadMessageMutation,
  PostMutation,
  AccountReactionMutation,
  RoleMutation,
  NotificationMutation,
  AccountRelationshipMutation,
  AccountCommunityMutation,
  CommunityMutation,
  IndexerRuleMutation,
  AccountCommunityRoleMutation,
  CommunityQuestMutation,
  CommunityRoomMutation,
  CommunityAssetMutation,
  ChannelMutation,
  AccountChannelMutation,
  PaymasterMutation
);

module.exports = { resolvers };
