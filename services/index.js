const { Service: NotificationService } = require("./NotificationService");
const { Service: AuthService } = require("./AuthService");
const { Service: AccessControlService } = require("./AccessControlService");
const { Service: ExpService } = require("./ExpService");
const {
  Service: AccountCommunityService,
} = require("./AccountCommunityService");
const { Service: SearchService } = require("./SearchService");
const { Service: CommunityService } = require("./CommunityService");
const { Service: RichBlockService } = require("./RichBlockService");
const { Service: IndexerRuleService } = require("./IndexerRuleService");
const { Service: RoleService } = require("./RoleService");
const { Service: ChannelService } = require("./ChannelService");
const {
  Service: AccountCommunityRoleService,
} = require("./AccountCommunityRoleService");
const { Service: AccountService } = require("./AccountService");
const { Service: PostService } = require("./PostService");
const {
  Service: AccountRecovererService,
} = require("./AccountRecovererService");

module.exports = {
  NotificationService: new NotificationService(),
  AccessControlService: new AccessControlService(),
  AuthService: new AuthService(),
  AccountCommunityService: new AccountCommunityService(),
  SearchService: new SearchService(),
  ExpService: new ExpService(),
  CommunityService: new CommunityService(),
  RichBlockService: new RichBlockService(),
  IndexerRuleService: new IndexerRuleService(),
  RoleService: new RoleService(),
  AccountCommunityRoleService: new AccountCommunityRoleService(),
  AccountService: new AccountService(),
  ChannelService: new ChannelService(),
  PostService: new PostService(),
  AccountRecovererService: new AccountRecovererService(),
};
