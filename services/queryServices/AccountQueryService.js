const mongoose = require("mongoose");
const { Service: AccountService } = require("../AccountService");
const {
  Service: FarcasterHubService,
} = require("../identities/FarcasterHubService");
const { AccountCommunity } = require("../../models/AccountCommunity");
const { AccountNonce } = require("../../models/AccountNonce");
const { AccountCommunityRole } = require("../../models/AccountCommunityRole");
const { Service: _CacheService } = require("../cache/CacheService");
const { config: walletConfig } = require("../../helpers/constants/wallet");
const { ethers } = require("ethers");
const {
  resolveEnsDataFromAddress,
} = require("../../helpers/resolve-ens-data-from-address");
const { isDeployedContract } = require("../../helpers/is-deployed-contract");

class AccountQueryService extends AccountService {
  /**
   * Return if the account is a BEB domain holder
   * @returns Promise<Boolean>
   */
  async hasPremiumRole(account) {
    if (!account?._id) return false;
    if (
      !process.env.BEBVERSE_HOLDER_COMMUNITY_ID ||
      !process.env.BEBVERSE_HOLDER_ROLE_ID
    )
      return false;

    // Check if account has the BEB domain holder role
    const accountCommunity = await AccountCommunity.findOne({
      account: account._id,
      community: mongoose.Types.ObjectId(
        process.env.BEBVERSE_HOLDER_COMMUNITY_ID
      ),
    });
    if (!accountCommunity) return false;

    const domainHolderRole = await AccountCommunityRole.exists({
      accountCommunity: accountCommunity._id,
      role: mongoose.Types.ObjectId(process.env.BEBVERSE_HOLDER_ROLE_ID),
      isValid: true,
    });

    return !!domainHolderRole;
  }

  async backpackClaimed(account) {
    const CacheService = new _CacheService();
    const config = walletConfig();
    // const cached = await CacheService.get({
    //   key: `BackpackClaimed`,
    //   params: {
    //     account: account._id,
    //   },
    // });
    // if (cached) return cached;
    const _backpackAddress = await this.backpackAddress(account);
    if (!_backpackAddress) return false;
    const isClaimed = await isDeployedContract(_backpackAddress, {
      network: config.CHAIN_ID,
      apiKey: config.API_KEY,
    });
    if (isClaimed) {
      CacheService.set({
        key: `BackpackClaimed`,
        params: {
          account: account._id,
        },
        value: isClaimed,
        expiresAt: null,
      });
    }
    return isClaimed;
  }

  async backpackAddress(account) {
    try {
      const populated = await account?.populate?.("addresses");
      const ownerAddress = populated?.addresses?.[0]?.address;

      if (!account || !ownerAddress) return null;
      const CacheService = new _CacheService();
      // const cached = await CacheService.get({
      //   key: `BackpackAddress`,
      //   params: {
      //     account: account._id,
      //   },
      // });
      // if (cached) return cached;

      const config = walletConfig();
      const provider = new ethers.providers.AlchemyProvider(
        config.CHAIN_ID,
        config.API_KEY
      );

      const accountFactoryContract = new ethers.Contract(
        config.FACTORY_CONTRACT_ADDRESS,
        config.FACTORY_ABI,
        provider
      );
      const accountNonce = await AccountNonce.findOne({
        account: account._id,
      });
      const salt = accountNonce.salt;

      const create2Address = await accountFactoryContract.getAddress(
        ownerAddress,
        salt
      );
      CacheService.set({
        key: `BackpackAddress`,
        params: {
          account: account._id,
        },
        value: create2Address,
        expiresAt: null,
      });

      return create2Address;
    } catch (e) {
      return null;
    }
  }
  identities(account) {
    try {
      const FarcasterService = new FarcasterHubService();
      return {
        _id: account._id,
        farcaster: async (args = {}, context) => {
          const profile = await FarcasterService.getProfileByAccount(
            account,
            context.isExternal
          );
          return profile;
        },
        ens: async () => {
          await account.populate("addresses");
          const { avatarUrl, twitter, ens } = await resolveEnsDataFromAddress(
            account.addresses[0].address
          );

          return {
            avatarUrl,
            twitter,
            ens,
            account: account,
            _id: account._id,
          };
        },
      };
    } catch (e) {
      return {
        _id: account._id,
        farcaster: null,
        ens: null,
      };
    }
  }
}

module.exports = { Service: AccountQueryService };
