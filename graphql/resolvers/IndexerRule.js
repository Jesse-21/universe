const { Community } = require("../../models/Community");
const { Address } = require("../../models/Address");

const { IndexerRule } = require("../../models/IndexerRule");

const { IndexerRuleService } = require("../../services");
const resolvers = {
  IndexerRuleAllowlist: {
    indexerRule: async (parent) => {
      return IndexerRule.findById(parent.indexerRuleId);
    },
    addresses: async (parent, args = { limit: 1000, offset: 0 }) => {
      const start = args.offset * args.limit;
      const end = start + args.limit;
      return parent?.addresses?.slice?.(start, end);
    },
  },
  IndexerRuleNFT: {
    indexerRule: async (parent) => {
      return IndexerRule.findById(parent.indexerRuleId);
    },
    address: async (parent) => {
      return Address.findById(parent.address);
    },
  },
  IndexerRuleAPI: {
    indexerRule: async (parent) => {
      return IndexerRule.findById(parent.indexerRuleId);
    },
  },
  IndexerRuleData: {
    __resolveType(parent) {
      switch (parent.indexerRuleType) {
        case "NFT":
          return "IndexerRuleNFTUnion";
        case "ALLOWLIST":
          return "IndexerRuleAllowlistUnion";
        case "API":
          return "IndexerRuleAPIUnion";
        default:
          return "IndexerRuleNFTUnion";
      }
    },
  },
  IndexerRule: {
    community: async (parent) => {
      return Community.findById(parent.community);
    },
    ruleOwnerType: async (parent) => {
      return IndexerRuleService.getRuleOwnerType(parent);
    },
    ruleData: async (parent) => {
      const data = await IndexerRuleService.getRuleData(parent);
      if (parent.indexerRuleType === "NFT") {
        return {
          _id: parent.ruleDataId,
          indexerRuleType: parent.indexerRuleType,
          indexerRuleNFTData: data,
        };
      } else if (parent.indexerRuleType === "ALLOWLIST") {
        return {
          _id: parent.ruleDataId,
          indexerRuleType: parent.indexerRuleType,
          indexerRuleAllowlistData: data,
        };
      } else if (parent.indexerRuleType === "API") {
        return {
          _id: parent.ruleDataId,
          indexerRuleType: parent.indexerRuleType,
          indexerRuleAPIData: data,
        };
      } else {
        return null;
      }
    },
  },
};

module.exports = { resolvers };
