const merge = require("lodash/merge");
const { resolvers: CommunityQuest } = require("./CommunityQuest");

const resolvers = merge(CommunityQuest);

module.exports = { resolvers };
