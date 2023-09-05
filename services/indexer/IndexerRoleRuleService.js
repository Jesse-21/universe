const axios = require("axios").default;

const { IndexerRuleAllowlist } = require("../../models/IndexerRuleAllowlist");
const { IndexerRuleNFT } = require("../../models/IndexerRuleNFT");
const { IndexerRuleAPI } = require("../../models/IndexerRules/IndexerRuleAPI");

const { Service: _AlchemyService } = require("../../services/AlchemyService");

const {
  getFarcasterUserByConnectedAddress,
} = require("../../helpers/farcaster");

const AlchemyServiceMainnet = new _AlchemyService({
  apiKey: process.env.HOMESTEAD_NODE_URL,
});

class IndexerRoleRuleService {
  /**
   * Determine if a role is claimable according to a rule of type NFT
   * @param {IndexerRule} indexerRule
   * @param {{ address: String, contractAddresses: String[] }} data - the address to check against the nft rule data
   * @returns {Promise<boolean>}
   */
  async _canClaimNFTRole(indexerRule, { data = {} }) {
    const { address } = data;
    if (!address) return false;

    const ruleData = await IndexerRuleNFT.findById(
      indexerRule?.ruleDataId
    ).populate("address");
    if (!ruleData) throw new Error("Invalid indexerRule");

    const isOwner = await AlchemyServiceMainnet.verifyOwnership({
      address: address,
      contractAddresses: [ruleData.address.address],
    });

    return isOwner;
  }

  /**
   * Determine if a role is claimable according to a rule of type ALLOWLIST
   * @param {IndexerRule} indexerRule
   * @param {{ address: String }} data - the address to check against the allowlist rule data
   * @returns {Promise<boolean>}
   */
  async _canClaimAllowlistRole(indexerRule, { data = {} }) {
    const { address } = data;
    if (!address) return false;

    const ruleData = await IndexerRuleAllowlist.findById(
      indexerRule?.ruleDataId
    );
    if (!ruleData) throw new Error("Invalid indexerRule");

    const found = ruleData.addresses.find(
      (a) => a.toLowerCase() === address?.toLowerCase()
    );
    return !!found;
  }

  /**
   * Determine if a role is claimable according to a rule of type API
   * @param {IndexerRule} indexerRule
   * @param {{ address: String }} data - the address to check against the API rule data
   * @returns {Promise<boolean>}
   */
  async _canClaimAPIRole(indexerRule, { data = {} }) {
    if (!data?.address) return false;
    const ruleData = await IndexerRuleAPI.findById(indexerRule?.ruleDataId);
    if (!ruleData) throw new Error("Invalid indexerRule");

    try {
      const { data: apiCallData } = await axios.get(ruleData.uri, {
        params: {
          address: data.address,
        },
        timeout: 5000,
      });
      return !!apiCallData?.success;
    } catch (e) {
      return false;
    }
  }

  /**
   * Determine if a role is claimable according to a rule of type FARCASTER
   * @param {IndexerRule} indexerRule
   * @param {{ account: Account }} data - the address to check against the allowlist rule data
   * @returns {Promise<boolean>}
   */
  async _canClaimFarcasterRole(_, { data = {} }) {
    try {
      const farcasterUser = await getFarcasterUserByConnectedAddress(
        data.address
      );

      return !!farcasterUser;
    } catch (e) {
      return false;
    }
  }

  /**
   * Determine if a role is claimable according to a rule
   * @param {IndexerRule} indexerRule
   * @param {Object} data - data to pass to the verification function, i.e address for _canClaimAllowlistRole
   * @returns {Promise<boolean>}
   */
  async canClaimRole(indexerRule, { data }) {
    if (!indexerRule) throw new Error("Invalid parameters");

    switch (indexerRule.indexerRuleType) {
      case "NFT":
        return await this._canClaimNFTRole(indexerRule, { data });
      case "ALLOWLIST":
        return await this._canClaimAllowlistRole(indexerRule, { data });
      case "FARCASTER":
        return await this._canClaimFarcasterRole(indexerRule, { data });
      case "API":
        return await this._canClaimAPIRole(indexerRule, { data });
      case "PUBLIC":
        return true;
      default:
        return false;
    }
  }
}

module.exports = { Service: IndexerRoleRuleService };
