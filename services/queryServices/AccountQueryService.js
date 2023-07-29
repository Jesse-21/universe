const mongoose = require("mongoose");
const { Service: AccountService } = require("../AccountService");
const {
  Service: FarcasterServiceV2,
} = require("../identities/FarcasterServiceV2");
const { AccountCommunity } = require("../../models/AccountCommunity");
const { AccountNonce } = require("../../models/AccountNonce");
const { AccountCommunityRole } = require("../../models/AccountCommunityRole");
const { Service: _CacheService } = require("../cache/CacheService");
const { dev } = require("../../helpers/registrar");
const { ethers } = require("ethers");
const {
  resolveEnsDataFromAddress,
} = require("../../helpers/resolve-ens-data-from-address");

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
  async backpackAddress(account) {
    const populated = await account?.populate?.("addresses");
    const ownerAddress = populated?.addresses?.[0]?.address;

    if (!account || !ownerAddress) return null;
    const CacheService = new _CacheService();
    const cached = await CacheService.get({
      key: `BackpackAddress`,
      params: {
        account: account._id,
      },
    });
    if (cached) return cached;

    const config = dev();
    const provider = new ethers.providers.AlchemyProvider(
      config.NODE_NETWORK,
      config.NODE_URL
    );

    const accountFactoryContract = new ethers.Contract(
      config.FACTORY_CONTRACT_ADDRESS,
      config.FACTORY_ABI,
      provider
    );
    const accountNonce = await AccountNonce.findOne({
      account: account._id,
    });
    const salt = accountNonce?.salt;
    if (!salt) return null;

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
  }
  identities(account) {
    try {
      const FarcasterService = new FarcasterServiceV2();
      return {
        _id: account._id,
        farcaster: async () => {
          await account.populate("addresses");
          const profile = await FarcasterService.getProfileByAddress(
            account.addresses[0].address
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
