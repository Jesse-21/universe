const merge = require("lodash/merge");
const { resolvers: AccountQuery } = require("./AccountQuery");
const { resolvers: CommunityAssetQuery } = require("./CommunityAssetQuery");
const { resolvers: CommunityQuery } = require("./CommunityQuery");
const { resolvers: NotificationQuery } = require("./NotificationQuery");
const { resolvers: RoleQuery } = require("./RoleQuery");
const { resolvers: SearchQuery } = require("./SearchQuery");
const { resolvers: QuestQuery } = require("./QuestQuery");
const { resolvers: CommunityQuestQuery } = require("./CommunityQuestQuery");
const { resolvers: ChannelRecipientQuery } = require("./ChannelRecipientQuery");
const { resolvers: ChannelQuery } = require("./ChannelQuery");

const resolvers = merge(
  CommunityQuery,
  CommunityQuestQuery,
  AccountQuery,
  CommunityAssetQuery,
  NotificationQuery,
  RoleQuery,
  SearchQuery,
  QuestQuery,
  ChannelRecipientQuery,
  ChannelQuery
);

module.exports = { resolvers };
