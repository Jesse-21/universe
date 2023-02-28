const Sentry = require("@sentry/node");

const {
  Service: IndexerRoleRuleService,
} = require("./indexer/IndexerRoleRuleService");

const { IndexerRule } = require("../models/IndexerRule");
const { Address } = require("../models/Address");
const { Role } = require("../models/Role");
const { Channel } = require("../models/Channel");
const { RichBlock } = require("../models/RichBlocks/RichBlock");
const { IndexerRuleNFT } = require("../models/IndexerRuleNFT");
const { IndexerRuleAPI } = require("../models/IndexerRules/IndexerRuleAPI");
const { IndexerRuleSales } = require("../models/IndexerRuleSales");
const { IndexerRuleAllowlist } = require("../models/IndexerRuleAllowlist");
const {
  IndexerRuleCollection,
} = require("../models/IndexerRules/IndexerRuleCollection");
/**
 * IndexerRuleData = IndexerRuleNFT | IndexerRuleAllowlist | IndexerRuleSales
 * IndexerRuleOwner = Role | Channel | RichBlock
 */
class IndexerRuleService extends IndexerRoleRuleService {
  /** Allowed rule owner type */
  get _validRuleOwnerTypes() {
    return [0, 1, 2]; // role(0), channel(1), and rich block(2)
  }
  /** Allowed rule types for Channel */
  get _validChannelRuleTypes() {
    return ["SALES"];
  }
  /** Allowed rule types for Rich Block */
  get _validRichBlockRuleTypes() {
    return ["COLLECTION", "NFT", "PUBLIC", "ALLOWLIST", "FARCASTER", "API"];
  }
  /** Allowed rule types for Role */
  get _validRoleRuleTypes() {
    return ["NFT", "PUBLIC", "ALLOWLIST", "FARCASTER", "API"];
  }

  /**
   * Check if a rule is valid before creating it
   * @retuns {boolean || Error}
   */
  async _beforeCreateRuleCheck({
    communityId,
    ruleOwnerType,
    ruleOwnerId,
    indexerRuleType,
  }) {
    /** 1. check for required params */
    if (!communityId || !ruleOwnerId || !indexerRuleType) {
      throw new Error("Missing required parameters");
    }
    /** 2. check for valid rule owner types */
    if (!this._validRuleOwnerTypes.includes(ruleOwnerType)) {
      throw new Error(
        "Only role(0), channel(1) and rich blocks(2) are supported"
      );
    }

    /** 2.5. check for existing rule for ruleOwnerType and ruleOwnerId.
     * This is to prevent creating multiple rules for the same ruleOwnerType and ruleOwnerId (for now) */
    const existingRule = await IndexerRule.exists({
      communityId,
      ruleOwnerType,
      ruleOwnerId,
    });
    if (existingRule) {
      throw new Error(
        "An existing rule exists for this ruleOwnerType and ruleOwnerId"
      );
    }

    /** 3. check for valid indexer rule type for role and channel */
    switch (ruleOwnerType) {
      case 0: {
        if (!this._validRoleRuleTypes.includes(indexerRuleType)) {
          throw new Error(
            `Invalid indexerRuleType for role(0): ${indexerRuleType}`
          );
        }
        break;
      }
      case 1: {
        if (!this._validChannelRuleTypes.includes(indexerRuleType)) {
          throw new Error(
            `Invalid indexerRuleType for channel(1): ${indexerRuleType}`
          );
        }
        break;
      }
      case 2: {
        if (!this._validRichBlockRuleTypes.includes(indexerRuleType)) {
          throw new Error(
            `Invalid indexerRuleType for rich blcoks(2): ${indexerRuleType}`
          );
        }
        break;
      }
      default:
        break; // already checked prior in 2.
    }

    /** 4. check if ruleOwnerId exists */
    switch (ruleOwnerType) {
      case 0: {
        const role = await Role.exists({ _id: ruleOwnerId });
        if (!role) throw new Error("Role does not exist");
        break;
      }
      case 1: {
        const channel = await Channel.exists({ _id: ruleOwnerId });
        if (!channel) throw new Error("Channel does not exist");
        break;
      }
      default:
        break; // already checked prior in 2.
    }
    return true;
  }
  /**
   * Create a new IndexerRuleCollection rule
   * @param {ObjectId} indexerRuleId - the id of the IndexerRule
   * @param {Partial<IndexerRuleCollection>} ruleData - the data for the rule
   * @returns IndexerRuleCollection
   */
  async createCollectionRule(indexerRuleId, { contractAddress, chainId }) {
    const _contractAddress = await Address.findOrCreate({
      address: contractAddress,
      chainId,
    });
    const rule = await IndexerRuleCollection.create({
      contractAddress: _contractAddress._id,
      indexerRuleId,
    });
    return rule;
  }
  /**
   * Create a new IndexerRuleAllowlist rule
   * @param {ObjectId} indexerRuleId - the id of the IndexerRule
   * @param {Partial<IndexerRuleAllowlist>} ruleData - the data for the rule
   * @returns IndexerRuleAllowlist
   */
  async createAllowlistRule(indexerRuleId, { chainId, addresses }) {
    const rule = await IndexerRuleAllowlist.create({
      addresses,
      chainId,
      indexerRuleId,
    });
    return rule;
  }
  /**
   * Create a new IndexerRuleNFT rule
   * @param {ObjectId} indexerRuleId - the id of the IndexerRule
   * @param {Partial<IndexerRuleNFT>} ruleData - the data for the rule
   * @returns IndexerRuleNFT
   */
  async createNFTRule(indexerRuleId, ruleData = {}) {
    const { address, chainId, tokenId, minAmount } = ruleData;
    if (!address || !indexerRuleId) {
      throw new Error("Missing required parameters");
    }

    const _address = await Address.findOrCreate({ address, chainId });

    const rule = await IndexerRuleNFT.create({
      addressId: _address._id,
      tokenId,
      minAmount,
      indexerRuleId,
    });
    return rule;
  }
  /**
   * Create a new IndexerRuleAPI rule
   * @param {ObjectId} indexerRuleId - the id of the IndexerRule
   * @param {Partial<IndexerRuleAPI>} ruleData - the data for the rule
   * @returns IndexerRuleAPI
   */
  async createAPIrule(indexerRuleId, ruleData = {}) {
    const { uri } = ruleData;

    const rule = await IndexerRuleAPI.create({
      uri,
      indexerRuleId,
    });
    return rule;
  }
  /**
   * Create a new IndexerRuleData with corresponding ruleData
   * @param {indexerRuleType} indexerRuleType
   * @param {ObjectId} indexerRuleId - the id of the IndexerRule
   * @param {IndexerRuleData} ruleData
   * @returns IndexerRuleData
   */
  async createRuleData({ indexerRuleType, indexerRuleId, ruleData }) {
    try {
      let indexerRuleData = null;

      switch (indexerRuleType) {
        case "NFT":
          indexerRuleData = await this.createNFTRule(indexerRuleId, ruleData);
          break;
        case "ALLOWLIST":
          indexerRuleData = await this.createAllowlistRule(
            indexerRuleId,
            ruleData
          );
          break;
        case "API":
          indexerRuleData = await this.createAPIrule(indexerRuleId, ruleData);
          break;
        case "SALES":
          // @TODO create sales rule
          break;
        case "COLLECTION":
          indexerRuleData = await this.createCollectionRule(
            indexerRuleId,
            ruleData
          );
          break;
      }
      return indexerRuleData;
    } catch (e) {
      Sentry.captureException(e, "IndexerRuleService.createRuleData");
      throw new Error(e.message);
    }
  }

  /**
   * Create a new IndexerRule with corresponding ruleData
   * @param {IndexerRule} rule
   * @returns [IndexerRule, IndexerRuleData]
   */
  async createRuleWithData({
    indexerRuleType,
    ruleData = {},
    communityId,
    ruleOwnerType,
    ruleOwnerId,
  }) {
    await this._beforeCreateRuleCheck({
      communityId,
      ruleOwnerType,
      ruleOwnerId,
      indexerRuleType,
    });

    try {
      const indexerRule = new IndexerRule({
        community: communityId,
        ruleOwnerType,
        ruleOwnerId,
        indexerRuleType,
      });
      const indexerRuleData = await this.createRuleData({
        indexerRuleType,
        indexerRuleId: indexerRule._id,
        ruleData,
      });

      indexerRule.ruleDataId = indexerRuleData?._id;
      await indexerRule.save();
      return [indexerRule, indexerRuleData];
    } catch (e) {
      Sentry.captureException(e, "IndexerRuleService.createRuleWithData");
      throw new Error(`Error creating rule: ${e.message}`);
    }
  }

  /**
   * Get the corresponding ruleDataId for a given ruleId
   * @param {IndexerRule} rule
   * @returns IndexerRuleData
   */
  async getRuleData(rule) {
    if (!rule) return null;
    switch (rule.indexerRuleType) {
      case "NFT":
        return IndexerRuleNFT.findById(rule.ruleDataId);
      case "SALES":
        return IndexerRuleSales.findById(rule.ruleDataId);
      case "ALLOWLIST":
        return IndexerRuleAllowlist.findById(rule.ruleDataId);
      case "COLLECTION":
        return IndexerRuleCollection.findById(rule.ruleDataId);
      case "API":
        return IndexerRuleAPI.findById(rule.ruleDataId);
      default:
        return null;
    }
  }

  /**
   * Get the corresponding ruleOwner for a given rule
   * @param {IndexerRule} rule
   * @returns IndexerRuleOwner
   */
  async getRuleOwner(rule) {
    if (!rule) return null;
    switch (rule.ruleOwnerType) {
      case 0:
        return await Role.findById(rule.ruleOwnerId);
      case 1:
        return await Channel.findById(rule.ruleOwnerId);
      case 2:
        return await RichBlock.findById(rule.ruleOwnerId);
      default:
        return null;
    }
  }

  /**
   * Edit a indexer rule. Delete its old ruleData and create a new one.
   * @param {ObjectId} ruleId
   * @returns Promise<IndexerRule>
   */
  async editRule(rule, { indexerRuleType, ruleData = {} }) {
    if (!rule) return null;
    await this.deleteRuleData(rule); // delete old ruleData
    const newRuleData = await this.createRuleData({
      indexerRuleType,
      indexerRuleId: rule._id,
      ruleData,
    }); // create new ruleData
    const editedRule = await rule.edit({
      ruleDataId: newRuleData?._id,
      indexerRuleType,
    });

    return editedRule;
  }

  /**
   * Delete a indexer rule and its ruleDataId
   * 🚨 Do not use this by itself, need to also delete from rule owner indexerRules 🚨
   * @param {ObjectId} ruleId
   * @returns Promise<ObjectId> deleted ruleId
   */
  async deleteRule(ruleId) {
    if (!ruleId) return null;
    const rule = await IndexerRule.findById(ruleId);

    if (rule) {
      await rule.remove();
      await this.deleteRuleData(rule);
    }

    return ruleId;
  }
  /**
   * Delete a rule's ruleData
   * @param {ObjectId} ruleId
   * @returns Promise<ObjectId> deleted ruleDataId
   */
  async deleteRuleData(rule) {
    const ruleData = await this.getRuleData(rule);
    if (!rule || !ruleData) return null;

    await ruleData.remove();

    return ruleData._id;
  }

  getRuleOwnerType(rule) {
    if (!rule) return null;
    switch (rule.ruleOwnerType) {
      case 0:
        return "ROLE";
      case 1:
        return "CHANNEL";
      case 2:
        return "RICH_BLOCK";
      default:
        return null;
    }
  }
}

module.exports = { Service: IndexerRuleService };
