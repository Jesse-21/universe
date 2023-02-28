const { IndexerRule } = require("../../models/IndexerRule");

const { Service: _CommunityService } = require("../CommunityService");
const { Service: IndexerRuleService } = require("../IndexerRuleService");

class IndexerRuleMutationService extends IndexerRuleService {
  async _canEditRuleOwnerOrError(indexerRule) {
    if (!indexerRule) throw new Error("Invalid indexer Rule");
    const ownerType = this.getRuleOwnerType(indexerRule);
    if (!ownerType === "ROLE") return true;

    // need to verify if role is editable
    const owner = await this.getRuleOwner(indexerRule);
    if (!owner?.editable) {
      throw new Error("You do not have permission to edit the role.");
    }
    return true;
  }

  async _canAdminRoleCommunityOrError(indexerRule, props, context) {
    if (!indexerRule) throw new Error("Invalid indexer Rule");
    const CommunityService = new _CommunityService();
    await indexerRule.populate("community");
    const canAdmin = await CommunityService.canAdmin(
      indexerRule.community,
      props,
      context
    );
    if (!canAdmin) {
      throw new Error("You do not have permission to edit the role.");
    }
    return true;
  }
  /**
   * Edit a role if authorized
   * @returns Promise<Post>
   */
  async editIndexerRuleOrUnauthorized(
    _,
    { indexerRuleId, ruleDataInput },
    context
  ) {
    const indexerRule = await IndexerRule.findById(indexerRuleId);
    await this._canAdminRoleCommunityOrError(
      indexerRule,
      { indexerRuleId },
      context
    );
    await this._canEditRuleOwnerOrError(indexerRule);

    const indexerRuleType = ruleDataInput.indexerRuleType;
    let ruleData;
    switch (indexerRuleType) {
      case "NFT":
        ruleData = ruleDataInput.indexerRuleNFTInput;
        break;
      case "ALLOWLIST":
        ruleData = ruleDataInput.indexerRuleAllowlistInput;
        break;
      case "API":
        ruleData = ruleDataInput.indexerRuleAPIInput;
        break;
      default:
        ruleData = null;
    }

    return await this.editRule(
      indexerRule,
      { indexerRuleType, ruleData },
      context
    );
  }
}

module.exports = { Service: IndexerRuleMutationService };
