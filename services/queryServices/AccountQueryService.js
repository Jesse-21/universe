const mongoose = require("mongoose");
const { Service: AccountService } = require("../AccountService");
const {
  Service: FarcasterServiceV2,
} = require("../identities/FarcasterServiceV2");
const { AccountCommunity } = require("../../models/AccountCommunity");
const { AccountCommunityRole } = require("../../models/AccountCommunityRole");

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
